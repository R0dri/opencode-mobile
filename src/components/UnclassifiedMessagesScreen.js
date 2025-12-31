import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { useTheme } from "../shared/components/ThemeProvider";
import Svg, { Path } from "react-native-svg";
import * as Clipboard from "expo-clipboard";

/**
 * DebugScreen component for displaying classified and unclassified messages
 * @param {Object} props - Component props
 * @param {Object} props.groupedUnclassifiedMessages - Grouped unclassified messages
 * @param {Object} props.allMessages - All messages grouped
 * @param {Array} props.events - Events array
 * @param {boolean} props.visible - Whether debug screen is visible
 * @param {Function} props.onClose - Function to close debug screen
 */
const DebugScreen = ({
  groupedUnclassifiedMessages = {},
  allMessages = {},
  events = [],
  visible = false,
  onClose = () => {},
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [activeTab, setActiveTab] = useState("classified");

  // Resizable drawer state
  const screenHeight = Dimensions.get("window").height;
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width,
  );
  const [drawerHeight, setDrawerHeight] = useState(screenHeight * 0.6); // Start at 60%
  const [isResizing, setIsResizing] = useState(false);
  const lastGestureY = useRef(0);
  const animatedHeight = useRef(new Animated.Value(screenHeight * 0.6)).current;

  // Screen width detection for wide screen behavior
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const isWideScreen = screenWidth >= 768;

  const toggleGroup = (type) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const copyToClipboard = async (content, label) => {
    try {
      await Clipboard.setStringAsync(content);
      Alert.alert("Copied!", `${label} copied to clipboard`);
    } catch (error) {
      Alert.alert("Error", "Failed to copy to clipboard");
    }
  };

  const getTotalCount = (groupedData) => {
    return Object.values(groupedData || {}).reduce(
      (sum, messages) => sum + messages.length,
      0,
    );
  };

  // Map props to expected variables
  const groupedMessages = allMessages;
  const unclassifiedMessages = groupedUnclassifiedMessages;

  // Handle resize gesture
  const onGestureEvent = (event) => {
    const { translationY } = event.nativeEvent;
    const newHeight = Math.max(
      screenHeight * 0.3, // Minimum 30%
      Math.min(
        screenHeight * 0.9, // Maximum 90%
        drawerHeight - translationY,
      ),
    );
    animatedHeight.setValue(newHeight);
  };

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      const newHeight = drawerHeight - translationY;

      // Snap to common heights if close and velocity is low
      let finalHeight = newHeight;
      const snapThreshold = screenHeight * 0.05; // 5% threshold

      if (Math.abs(velocityY) < 500) {
        // Low velocity for snap
        const heights = [0.4, 0.6, 0.8].map((h) => screenHeight * h);
        for (const height of heights) {
          if (Math.abs(newHeight - height) < snapThreshold) {
            finalHeight = height;
            break;
          }
        }
      }

      // Apply constraints
      finalHeight = Math.max(
        screenHeight * 0.3,
        Math.min(screenHeight * 0.9, finalHeight),
      );

      setDrawerHeight(finalHeight);
      Animated.spring(animatedHeight, {
        toValue: finalHeight,
        useNativeDriver: false,
      }).start();
      setIsResizing(false);
    } else if (event.nativeEvent.state === State.BEGAN) {
      setIsResizing(true);
    }
  };

  const getGroupStyle = (isClassified) => ({
    borderColor: isClassified ? "#4CAF50" : "#FFC107",
    backgroundColor: isClassified ? "#e8f5e8" : "#fff8e1",
    headerBackground: isClassified ? "#4CAF50" : "#FFC107",
  });

  const copyAllData = () => {
    const allData = {
      timestamp: new Date().toISOString(),
      summary: {
        classified: {
          types: Object.keys(groupedMessages?.classified || {}).length,
          total: getTotalCount(groupedMessages?.classified),
        },
        unclassified: {
          types: Object.keys(unclassifiedMessages || {}).length,
          total: getTotalCount(unclassifiedMessages),
        },
      },
      groupedMessages,
      unclassifiedMessages,
    };
    copyToClipboard(JSON.stringify(allData, null, 2), "All debug data");
  };

  // Grip handle component
  const GripHandle = () => (
    <View style={styles.gripContainer}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <View style={styles.gripHandle}>
          <View style={styles.gripIndicator}>
            <View style={styles.gripDot} />
            <View style={styles.gripDot} />
            <View style={styles.gripDot} />
          </View>
        </View>
      </PanGestureHandler>
    </View>
  );

  const renderMessageGroup = (type, messages, isClassified = false) => {
    const isExpanded = expandedGroups[type];
    const messageCount = messages.length;
    const groupStyles = getGroupStyle(isClassified);

    return (
      <View
        key={type}
        style={[
          styles.groupContainer,
          {
            borderColor: groupStyles.borderColor,
            backgroundColor: groupStyles.backgroundColor,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.groupHeader,
            { backgroundColor: groupStyles.headerBackground },
          ]}
          onPress={() => toggleGroup(type)}
        >
          <Text style={styles.groupTitle}>
            {type} ({messageCount})
          </Text>
          <Svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            style={styles.expandIcon}
          >
            <Path
              d={isExpanded ? "M7 10l5 5 5-5z" : "M10 7l5 5-5 5z"}
              fill="#666666"
            />
          </Svg>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.groupContent}>
            {messages.map((message, index) => (
              <View key={index} style={styles.messageItem}>
                <Text style={styles.messageTimestamp}>
                  {new Date().toLocaleTimeString()}
                </Text>
                <View style={styles.messageHeader}>
                  <View style={styles.messageProject}>
                    <Svg width="12" height="12" viewBox="0 0 24 24">
                      <Path
                        d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
                        fill="#666666"
                      />
                    </Svg>
                    <Text style={styles.messageProjectText}>
                      {message.projectName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() =>
                      copyToClipboard(
                        JSON.stringify(message.rawData, null, 2),
                        "Message JSON",
                      )
                    }
                  >
                    <Text style={styles.copyButtonText}>📋</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.messageRaw}>
                  {JSON.stringify(message.rawData, null, 2)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const messageTypes = Object.keys(groupedUnclassifiedMessages || {});

  // Calculate message counts for debugging with maximum safety
  const safeAllMessages =
    allMessages && typeof allMessages === "object" ? allMessages : {};
  const safeGroupedUnclassified =
    groupedUnclassifiedMessages &&
    typeof groupedUnclassifiedMessages === "object"
      ? groupedUnclassifiedMessages
      : {};
  const safeEvents = Array.isArray(events) ? events : [];

  let totalAllMessages = 0;
  try {
    totalAllMessages = Object.values(safeAllMessages)
      .flatMap((obj) =>
        obj && typeof obj === "object" ? Object.values(obj) : [],
      )
      .flat().length;
  } catch (error) {
    console.error("Error calculating totalAllMessages:", error);
    totalAllMessages = 0;
  }

  let totalClassifiedMessages = 0;
  try {
    totalClassifiedMessages = Object.values(
      safeAllMessages.classified &&
        typeof safeAllMessages.classified === "object"
        ? safeAllMessages.classified
        : {},
    ).flat().length;
  } catch (error) {
    console.error("Error calculating totalClassifiedMessages:", error);
    totalClassifiedMessages = 0;
  }

  let totalUnclassifiedMessages = 0;
  try {
    totalUnclassifiedMessages = Object.values(safeGroupedUnclassified).flat()
      .length;
  } catch (error) {
    console.error("Error calculating totalUnclassifiedMessages:", error);
    totalUnclassifiedMessages = 0;
  }

  const totalEvents = safeEvents.length;

  // console.debug('Message counts calculated:', {
  //   totalAllMessages,
  //   totalClassifiedMessages,
  //   totalUnclassifiedMessages,
  //   totalEvents,
  //   messageTypesCount: messageTypes.length
  // });

  if (!visible) return null;

  if (isWideScreen) {
    // Wide screen: Right sidebar
    return (
      <Animated.View style={[styles.rightSidebar, { height: animatedHeight }]}>
        {/* Grip Handle */}
        <GripHandle />

        {/* Header Section */}
        <View style={styles.header}>
          {/* Top Row: Title and Close Button */}
          <View style={styles.headerTopRow}>
            <View style={styles.titleSection}>
              <Svg width="20" height="20" viewBox="0 0 24 24">
                <Path
                  d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
                  fill="#856404"
                />
              </Svg>
              <Text style={styles.titleText}>Message Debug</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {getTotalCount(groupedMessages?.classified || {})}
              </Text>
              <Text style={styles.statLabel}>Classified</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {getTotalCount(unclassifiedMessages || {})}
              </Text>
              <Text style={styles.statLabel}>Unclassified</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {Object.keys(groupedMessages?.classified || {}).length +
                  Object.keys(unclassifiedMessages || {}).length}
              </Text>
              <Text style={styles.statLabel}>Types</Text>
            </View>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "classified" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("classified")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "classified" && styles.activeTabText,
                ]}
              >
                ✅ Classified
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "unclassified" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("unclassified")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "unclassified" && styles.activeTabText,
                ]}
              >
                ⚠️ Unclassified
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          {(activeTab === "classified"
            ? Object.keys(groupedMessages?.classified || {})
            : Object.keys(unclassifiedMessages || {})
          ).length > 0 && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.copyAllButton}
                onPress={copyAllData}
              >
                <Text style={styles.copyAllButtonText}>📋 Export All Data</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView style={styles.content}>
          {(() => {
            const data =
              activeTab === "classified"
                ? groupedMessages?.classified
                : unclassifiedMessages;
            const types = Object.keys(data || {});
            const isClassified = activeTab === "classified";

            if (!data || types.length === 0) {
              return (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No {activeTab} messages yet
                  </Text>
                  <Text style={styles.emptySubtext}>
                    Messages will appear here when received
                  </Text>
                </View>
              );
            }

            return types.map((type) =>
              renderMessageGroup(type, data[type], isClassified),
            );
          })()}
        </ScrollView>
      </Animated.View>
    );
  } else {
    // Mobile: Bottom sheet modal
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <Animated.View style={[styles.container, { height: animatedHeight }]}>
            {/* Grip Handle */}
            <GripHandle />

            {/* Header Section */}
            <View style={styles.header}>
              {/* Top Row: Title and Close Button */}
              <View style={styles.headerTopRow}>
                <View style={styles.titleSection}>
                  <Svg width="20" height="20" viewBox="0 0 24 24">
                    <Path
                      d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
                      fill="#856404"
                    />
                  </Svg>
                  <Text style={styles.titleText}>Message Debug</Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {getTotalCount(groupedMessages?.classified || {})}
                  </Text>
                  <Text style={styles.statLabel}>Classified</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {getTotalCount(unclassifiedMessages || {})}
                  </Text>
                  <Text style={styles.statLabel}>Unclassified</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {Object.keys(groupedMessages?.classified || {}).length +
                      Object.keys(unclassifiedMessages || {}).length}
                  </Text>
                  <Text style={styles.statLabel}>Types</Text>
                </View>
              </View>

              {/* Tab Selector */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === "classified" && styles.activeTab,
                  ]}
                  onPress={() => setActiveTab("classified")}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "classified" && styles.activeTabText,
                    ]}
                  >
                    ✅ Classified
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === "unclassified" && styles.activeTab,
                  ]}
                  onPress={() => setActiveTab("unclassified")}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "unclassified" && styles.activeTabText,
                    ]}
                  >
                    ⚠️ Unclassified
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              {(activeTab === "classified"
                ? Object.keys(groupedMessages?.classified || {})
                : Object.keys(unclassifiedMessages || {})
              ).length > 0 && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.copyAllButton}
                    onPress={copyAllData}
                  >
                    <Text style={styles.copyAllButtonText}>
                      📋 Export All Data
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <ScrollView style={styles.content}>
              {(() => {
                const data =
                  activeTab === "classified"
                    ? groupedMessages?.classified
                    : unclassifiedMessages;
                const types = Object.keys(data || {});
                const isClassified = activeTab === "classified";

                if (!data || types.length === 0) {
                  return (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>
                        No {activeTab} messages yet
                      </Text>
                      <Text style={styles.emptySubtext}>
                        Messages will appear here when received
                      </Text>
                    </View>
                  );
                }

                return types.map((type) =>
                  renderMessageGroup(type, data[type], isClassified),
                );
              })()}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  }
};

const getStyles = (theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  rightSidebar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: theme.colors.background,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  gripContainer: {
    width: "100%",
    height: 36,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  gripHandle: {
    width: 48,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gripIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 32,
    height: 4,
  },
  gripDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textMuted,
  },
  header: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  actionRow: {
    marginTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  counterContainer: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 8,
    marginBottom: 16,
    borderRadius: 4,
  },
  counterText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: "monospace",
    textAlign: "center",
  },
  debugText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: "monospace",
    textAlign: "center",
    marginTop: 4,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  copyAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.statusConnecting,
    borderRadius: 8,
    alignItems: "center",
  },
  copyAllButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.statusUnreachable,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: theme.colors.background,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  activeTabText: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  groupContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.textPrimary,
  },
  expandIcon: {
    marginLeft: 8,
  },
  groupContent: {
    padding: 12,
  },
  messageItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  messageTimestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  messageProject: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  messageProjectText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  copyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.statusConnecting,
    borderRadius: 4,
  },
  copyButtonText: {
    color: theme.colors.background,
    fontSize: 12,
  },
  messageRaw: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: "monospace",
  },
});

export default DebugScreen;
