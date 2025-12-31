import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, Alert, Modal, FlatList, ScrollView, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
 import { getProjectDisplayName } from '../features';
 import SessionBusyIndicator from './common/SessionBusyIndicator';
 import { useTheme } from '../shared/components/ThemeProvider';

/**
   * SessionDrawer component for session management drawer
   * @param {Object} props - Custom props for session drawer
   */
const SessionDrawer = (props) => {
    console.debug('DEBUG: SessionDrawer rendering');
    const theme = useTheme();
    const { sessions = [], selectedSession = null, selectedProject = null, projects = [], sessionStatuses = {}, sessionLoading = false, onProjectSelect, onSessionSelect, deleteSession, onClose, createSession, isPersistent = false } = props;
   const getStyles = (theme) => ({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    fullTouchable: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    },
    drawer: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: screenWidth * 0.8,
      backgroundColor: theme.colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    drawerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    drawerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.surfaceSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    expandButton: {
      padding: 4,
    },
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    activeSessionItem: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.accent,
    },
    sessionContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sessionTouchable: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sessionTitle: {
      fontSize: 16,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    sessionTime: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    sessionMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    sessionSummary: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
      marginBottom: 4,
    },
    loadingContainer: {
      padding: 16,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
    emptyContainer: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    projectList: {
      paddingBottom: 16,
    },
    projectItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginBottom: 8,
      backgroundColor: theme.colors.surface,
    },
    activeProjectItem: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.accent,
      borderWidth: 1,
    },
    projectInfo: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    projectIcon: {
      marginRight: 8,
    },
    projectItemTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      flex: 1,
      marginBottom: 6,
    },
    projectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    projectFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    projectPath: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    vcsBadge: {
      backgroundColor: theme.colors.surfaceSecondary,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    vcsBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.success,
    },
    lastUpdated: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    activeProjectTitle: {
      color: theme.colors.accent,
      fontWeight: '600',
    },
    dropdownButton: {
      padding: 4,
      marginRight: 8,
      borderRadius: 4,
      backgroundColor: 'transparent',
    },
    dropdownIcon: {
      alignSelf: 'center',
    },
    dropdownOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 100,
    },
    dropdownContainer: {
      backgroundColor: theme.colors.surface,
      paddingVertical: 8,
      maxHeight: 450,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    dropdownHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.accent,
      backgroundColor: theme.colors.surface,
    },
    projectList: {
      maxHeight: 450,
      marginTop: 8,
    },
    projectItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginBottom: 8,
      backgroundColor: theme.colors.surface,
    },
    activeProjectItem: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderColor: theme.colors.accent,
      borderWidth: 1,
    },
    projectInfo: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    projectIcon: {
      marginRight: 8,
    },
    projectItemTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      flex: 1,
      marginBottom: 6,
    },
    projectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    projectFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    projectPath: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    vcsBadge: {
      backgroundColor: theme.colors.surfaceSecondary,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    vcsBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.success,
    },
    lastUpdated: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    activeProjectTitle: {
      color: theme.colors.accent,
      fontWeight: '600',
    },
    dropdownButton: {
      padding: 4,
      marginRight: 8,
      borderRadius: 4,
      backgroundColor: 'transparent',
    },
    dropdownIcon: {
      alignSelf: 'center',
    },
    childSessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    activeChildSessionItem: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    childIndent: {
      width: 16,
    },
    childSessionContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    childSessionTouchable: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    childSessionTitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    childSessionTitleRow: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    childSessionTime: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    childSessionMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    childSessionSummary: {
      fontSize: 9,
      color: theme.colors.textSecondary,
      marginTop: 1,
      marginBottom: 1,
    },
    skeletonItem: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    skeletonTitle: {
      height: 16,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      marginBottom: 4,
    },
    skeletonMeta: {
      height: 14,
      width: 80,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
    },
    skeletonTime: {
      height: 14,
      width: 50,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
    },
  });

  const styles = StyleSheet.create(getStyles(theme));

  const insets = useSafeAreaInsets();

   // Safety check
   if (!Array.isArray(sessions) || !Array.isArray(projects)) {
     console.error('SessionDrawer: sessions or projects is not an array', { sessions: typeof sessions, projects: typeof projects });
     return null;
   }

    const [projectDropdownVisible, setProjectDropdownVisible] = useState(false);
    const [expandedParents, setExpandedParents] = useState(new Set()); // Collapsed by default

    const { width: screenWidth } = Dimensions.get('window');
    const drawerWidth = screenWidth * 0.8;
    const [slideAnim] = useState(new Animated.Value(isPersistent ? 0 : -drawerWidth));

    useEffect(() => {
      if (!isPersistent) {
        // Animate in on mount
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }, [isPersistent, slideAnim]);

   const formatNaturalDate = (dateObj) => {
     const date = new Date(dateObj);
     const today = new Date();
     const yesterday = new Date(today);
     yesterday.setDate(yesterday.getDate() - 1);

     // Today
     if (date.toDateString() === today.toDateString()) {
       return 'Today';
     }

     // Yesterday
     if (date.toDateString() === yesterday.toDateString()) {
       return 'Yesterday';
     }

     // This week (Monday, Tuesday, etc.)
     const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
     const dayDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
     if (dayDiff <= 6) {
       return daysOfWeek[date.getDay()];
     }

     // Older dates - show date
     return date.toLocaleDateString();
   };

    const groupSessionsByDateAndParent = (sessions, sessionStatuses) => {
      const sections = [];
      const dateGroups = new Map();

      // Sort all sessions by time.updated (most recent first)
      const sortedSessions = [...sessions].sort((a, b) => b.time.updated - a.time.updated);

      // Group by date
      sortedSessions.forEach(session => {
        const dateKey = formatNaturalDate(session.time?.updated || session.time?.created);
        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, []);
        }
        dateGroups.get(dateKey).push(session);
      });

       // Sort date groups by date (most recent first)
       const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => {
         const dateA = new Date(a === 'Today' ? new Date() : a === 'Yesterday' ? new Date(Date.now() - 86400000) : a);
         const dateB = new Date(b === 'Today' ? new Date() : b === 'Yesterday' ? new Date(Date.now() - 86400000) : b);
         return dateB - dateA;
       });

      // For each date group, group by parent-child
      sortedDates.forEach(dateKey => {
        const dateSessions = dateGroups.get(dateKey);
        const parents = [];
        const childrenMap = new Map();

        // Separate parents and children within this date
        dateSessions.forEach(session => {
          if (!session.parentID) {
            parents.push(session);
            childrenMap.set(session.id, []);
          }
        });

        // Group children under parents
        dateSessions.forEach(session => {
          if (session.parentID) {
            if (childrenMap.has(session.parentID)) {
              childrenMap.get(session.parentID).push(session);
            } else {
              // Orphaned child - treat as parent
              parents.push(session);
              childrenMap.set(session.id, []);
            }
          }
        });

        // Add section if there are parents
        if (parents.length > 0) {
          sections.push({
            title: dateKey,
            data: parents,
            childrenMap: childrenMap
          });
        }
      });

      // Sort sections by the updated time of the first session (newest first)
      sections.sort((a, b) => b.data[0].time.updated - a.data[0].time.updated);

      return sections;
    };

    const toggleParentExpansion = (parentId) => {
      setExpandedParents(prev => {
        const newSet = new Set(prev);
        if (newSet.has(parentId)) {
          newSet.delete(parentId);
        } else {
          newSet.add(parentId);
        }
        return newSet;
      });
    };

    const handleClose = () => {
      if (isPersistent) {
        onClose();
        return;
      }
      Animated.timing(slideAnim, {
        toValue: -drawerWidth,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onClose();
      });
    };

    const handleProjectSelect = (project) => {
      onProjectSelect(project);
      onSessionSelect(null); // Clear selected session when switching projects
      setProjectDropdownVisible(false);
    };

     const handleSessionSelect = (session) => {
       onSessionSelect(session);
       if (!isPersistent) {
         setTimeout(() => handleClose(), 1000);
       }
       // Only expand if selecting a parent session
       if (!session.parentID) {
         setExpandedParents(new Set([session.id]));
       } else {
         // Collapse all when selecting a child
         setExpandedParents(new Set());
       }
     };

  const handleDeleteSession = (session) => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete "${session.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(session.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete session. Please try again.');
            }
          }
        }
      ]
    );
  };

   const handleCreateSession = () => {
      if (createSession && selectedProject) {
        createSession(selectedProject.id);
        if (!isPersistent) handleClose();
      }
    };



   // Group sessions by date and parent-child relationship
   const sections = groupSessionsByDateAndParent(sessions, sessionStatuses);

   // Find or create Today section and add new session inline
   const todaySection = sections.find(section => section.title === 'Today');
   if (todaySection) {
     todaySection.hasInlineNewSession = true;
   } else {
     sections.unshift({
       title: 'Today',
       data: [],
       childrenMap: new Map(),
       hasInlineNewSession: true
     });
   }

    const renderSectionHeader = ({ section }) => {
      const { title, hasInlineNewSession } = section;
      if (!title) return null;

      return (
        <View style={[styles.sectionHeader, hasInlineNewSession && styles.sectionHeaderNoMargin]}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
          {hasInlineNewSession && (
            <TouchableOpacity
              style={styles.inlineNewSessionButton}
              onPress={handleCreateSession}
              activeOpacity={0.7}
            >
              <Text style={styles.inlineNewSessionText}>+ New Session</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    };

   const truncatePath = (path) => {
     if (!path) return '';
     const maxLength = 50; // Increased for more space before truncation
     if (path.length <= maxLength) return path;

     // Find the last directory separator
     const lastSep = path.lastIndexOf('/');
     if (lastSep === -1) return '...' + path.slice(-maxLength + 3);

     const lastPart = path.slice(lastSep);
     if (lastPart.length <= maxLength) return '...' + lastPart;

     return '...' + lastPart.slice(-(maxLength - 3));
   };

  const renderProjectItem = ({ item: project }) => {
    const isActive = selectedProject?.id === project.id;
    const fullPath = project.worktree || project.directory;
    const lastUpdated = project.time?.updated ? new Date(project.time.updated).toLocaleDateString() : 'Unknown';
    return (
      <TouchableOpacity
        style={[styles.projectItem, isActive && styles.activeProjectItem]}
        onPress={() => handleProjectSelect(project)}
      >
        <View style={styles.projectInfo}>
          <View style={styles.projectHeader}>
            <Text style={[styles.projectItemTitle, isActive && styles.activeProjectTitle]}>
              {getProjectDisplayName(project.worktree) || 'Unnamed Project'}
            </Text>
            {project.vcs && (
              <View style={styles.vcsBadge}>
                <Text style={styles.vcsBadgeText}>{project.vcs.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.projectFooter}>
            <Text style={styles.projectPath} numberOfLines={1}>{truncatePath(fullPath)}</Text>
            <Text style={styles.lastUpdated}>Updated: {lastUpdated}</Text>
          </View>
        </View>

      </TouchableOpacity>
    );
  };

   // Large dropdown button component
   const LargeDropdownButton = ({ expanded, onPress }) => (
     <TouchableOpacity
       style={styles.dropdownButton}
       onPress={onPress}
       hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
     >
       <Svg width="14" height="14" viewBox="0 0 24 24" style={styles.dropdownIcon}>
         {expanded ? (
           // Chevron pointing up (expanded)
           <Path
             d="M6 15l6-6 6 6"
             stroke="#666666"
             strokeWidth="2"
             fill="none"
             strokeLinecap="round"
             strokeLinejoin="round"
           />
         ) : (
           // Chevron pointing down (collapsed)
           <Path
             d="M6 9l6 6 6-6"
             stroke="#666666"
             strokeWidth="2"
             fill="none"
             strokeLinecap="round"
             strokeLinejoin="round"
           />
         )}
       </Svg>
     </TouchableOpacity>
   );

    const renderParentSession = ({ parent, children }) => {
      const isActive = selectedSession && selectedSession.id === parent.id;
      const isExpanded = expandedParents.has(parent.id);
      const isBusy = sessionStatuses[parent.id]?.type === 'busy';
      const isParentBusy = children.some(child => sessionStatuses[child.id]?.type === 'busy') || isBusy;
      const timeString = new Date(parent.time?.updated || parent.time?.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

       return (
         <View>
           {/* Parent Row */}
            <View style={[styles.sessionItem, isActive && styles.activeSessionItem]}>
              <TouchableOpacity
                style={styles.sessionTouchable}
                onPress={() => handleSessionSelect(parent)}
                activeOpacity={0.7}
              >
                <View style={styles.titleContainer}>
                  <Text style={[styles.sessionTitleRow, isActive && styles.activeSessionTitle, isParentBusy && styles.busySessionTitle]} numberOfLines={2}>
                    {parent.title}
                  </Text>
                  {children.length > 0 && (
                    <Text style={styles.sessionCount}>
                      {parent.summary && (parent.summary.additions > 0 || parent.summary.deletions > 0 || parent.summary.files > 0) && (
                        <Text>
                          <Text style={styles.summaryAdditions}>+{parent.summary.additions}</Text> <Text style={styles.summaryDeletions}>-{parent.summary.deletions}</Text> {parent.summary.files === 1 ? '1 file' : `${parent.summary.files} files`}
                        </Text>
                      )}
                      {' • '}{children.length} session{children.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
                <View style={styles.timeContainer}>
                  {isParentBusy ? (
                    <SessionBusyIndicator isBusy={true} />
                  ) : (
                    <Text style={styles.sessionTime}>
                      {timeString}
                    </Text>
                  )}
                </View>
             </TouchableOpacity>
           </View>

          {/* Children Rows (when expanded) */}
          {isExpanded && children.map(child => renderChildSession({ child }))}
        </View>
      );
    };

    const renderChildSession = ({ child }) => {
      const isActive = selectedSession && selectedSession.id === child.id;
      const isBusy = sessionStatuses[child.id]?.type === 'busy';
      const timeString = new Date(child.time?.updated || child.time?.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

       return (
         <View style={[styles.childSessionItem, isActive && styles.activeChildSessionItem]}>
           <View style={styles.childIndent} />
           <TouchableOpacity
             style={styles.childSessionTouchable}
             onPress={() => handleSessionSelect(child)}
             activeOpacity={0.7}
           >
             <View style={styles.titleContainer}>
               <Text style={[styles.childSessionTitleRow, isActive && styles.activeSessionTitle, isBusy && styles.busySessionTitle]} numberOfLines={1}>
                 {child.title}
                 {child.summary && (child.summary.additions > 0 || child.summary.deletions > 0 || child.summary.files > 0) && (
                   <Text style={styles.inlineSummary}>
                     {' '}<Text style={styles.summaryAdditions}>+{child.summary.additions}</Text> <Text style={styles.summaryDeletions}>-{child.summary.deletions}</Text> {child.summary.files === 1 ? '1 file' : `${child.summary.files} files`}
                   </Text>
                 )}
               </Text>
             </View>
             <View style={styles.timeContainer}>
               {isBusy ? (
                 <SessionBusyIndicator isBusy={true} />
               ) : (
                 <Text style={styles.childSessionTime}>
                   {timeString}
                 </Text>
               )}
             </View>
           </TouchableOpacity>
         </View>
       );
    };

    const renderSkeletonItem = () => (
      <View style={[styles.sessionItem, styles.skeletonItem]}>
        <View style={styles.sessionTouchable}>
          <View style={styles.skeletonTitle} />
          <View style={styles.sessionMetaRow}>
            <View style={styles.skeletonMeta} />
            <View style={styles.metaRight}>
              <View style={styles.skeletonTime} />
              <View style={styles.skeletonDelete} />
            </View>
          </View>
        </View>
      </View>
    );

     const renderItem = ({ item, section }) => {
       // Render parent session with its children
       const children = section.childrenMap.get(item.id) || [];
       return renderParentSession({ parent: item, children });
     };

   const drawerContent = (
     <Animated.View style={[styles.drawer, isPersistent && styles.persistentDrawer, !isPersistent && { transform: [{ translateX: slideAnim }] }]}>
       <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.projectSelector}
              onPress={() => setProjectDropdownVisible(!projectDropdownVisible)}
            >
              <Svg width="16" height="16" viewBox="0 0 24 24" style={[styles.dropdownIcon, { transform: [{ rotate: projectDropdownVisible ? '90deg' : '0deg' }] }]}>
                <Path d="M5 5 L15 12 L5 19" stroke="#333333" strokeWidth="3" fill="none" />
              </Svg>
              <Text style={styles.projectTitle} numberOfLines={1}>
                {selectedProject ? getProjectDisplayName(selectedProject.worktree) : 'Select Project'}
              </Text>
            </TouchableOpacity>
            {!isPersistent && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              >
                <Svg width="20" height="20" viewBox="0 0 24 24">
                  <Path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="#666666" />
                </Svg>
              </TouchableOpacity>
            )}
          </View>
         {sessionLoading ? (
           <View style={styles.list}>
             {Array.from({ length: 5 }, (_, i) => (
               <View key={i}>{renderSkeletonItem()}</View>
             ))}
           </View>
         ) : (
           <SectionList
             sections={sections}
             keyExtractor={(item) => item.id}
             renderItem={renderItem}
             renderSectionHeader={renderSectionHeader}
             showsVerticalScrollIndicator={true}
             scrollEnabled={true}
             style={styles.list}
             contentContainerStyle={styles.listContent}
           />
         )}
       </View>
     </Animated.View>
   );

  if (isPersistent) {
    return (
      <View>
        {drawerContent}
        <Modal
          visible={projectDropdownVisible}
          transparent={true}
          animationType="none"
          onRequestClose={() => setProjectDropdownVisible(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setProjectDropdownVisible(false)}
          >
            <View style={[styles.dropdownContainer, { width: screenWidth * 0.9 }]}>
              <Text style={styles.dropdownHeader}>Change Project</Text>
               <FlatList
                 data={projects}
                 keyExtractor={(item) => item.id}
                 renderItem={renderProjectItem}
                 style={styles.projectList}
                 contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 16, paddingBottom: 8 }}
                 showsVerticalScrollIndicator={false}
               />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  return (
     <View style={[styles.overlay, { top: insets.top }]}>
       <TouchableOpacity
         style={[styles.fullTouchable, { top: insets.top }]}
         activeOpacity={1}
         onPress={handleClose}
       />
       {drawerContent}
       <Modal
         visible={projectDropdownVisible}
         transparent={true}
         animationType="none"
         onRequestClose={() => setProjectDropdownVisible(false)}
       >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setProjectDropdownVisible(false)}
        >
          <View style={[styles.dropdownContainer, { width: screenWidth * 0.9 }]}>
            <Text style={styles.dropdownHeader}>Change Project</Text>
            <FlatList
              data={projects}
              keyExtractor={(item) => item.id}
              renderItem={renderProjectItem}
              style={styles.projectList}
              contentContainerStyle={{ paddingHorizontal: 8 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const getStyles = (theme) => ({

  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullTouchable: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    width: '80%', // 80% of screen width
    height: '100%', // Full height
    backgroundColor: theme.colors.surface,
  },
  persistentDrawer: {
    width: 320, // Fixed width for wide screens
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  container: {
    flex: 1,
  },
   listContent: {
     paddingBottom: 20,
   },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
    },
   projectTitle: {
     fontSize: 16,
     fontWeight: '600',
     color: theme.colors.textPrimary,
   },
     closeButton: {
       padding: 8,
     },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createIcon: {
    marginRight: 4,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  disabledText: {
    color: '#ccc',
  },
  list: {
    flex: 1,
  },

    sectionHeader: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: '#e9ecef',
      marginTop: 0,
      marginBottom: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      minHeight: 36,
    },
    sectionHeaderNoMargin: {
      marginBottom: 0,
    },
    sectionHeaderLeft: {
      justifyContent: 'center',
      paddingLeft: 12,
    },
    sectionHeaderText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#6c757d',
    },
    inlineNewSessionButton: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inlineNewSessionText: {
      fontSize: 12,
      color: theme.colors.success,
      fontWeight: '600',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6c757d',
  },
    sessionItem: {
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
     sessionTouchable: {
       flex: 1,
       paddingVertical: 16,
       paddingHorizontal: 16,
       flexDirection: 'row',
       alignItems: 'center',
     },

   activeSessionItem: {
     backgroundColor: theme.colors.surfaceSecondary,
   },
   activeSessionTitle: {
     color: theme.colors.accent,
     fontWeight: '600',
   },

   childSessionItem: {
     borderLeftWidth: 2,
     borderLeftColor: theme.colors.border,
     backgroundColor: theme.colors.surfaceSecondary,
   },
  sessionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
    sessionHeader: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    sessionMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginTop: 4,
    },
     sessionMetaRow: {
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'space-between',
       marginTop: 8,
     },
     metaLeft: {
       flexDirection: 'row',
       alignItems: 'center',
     },
     metaRight: {
       flexDirection: 'row',
       alignItems: 'center',
     },
     sessionCount: {
       fontSize: 14,
       color: theme.colors.textMuted,
     },
    sessionSummary: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginTop: 1,
      marginBottom: 1,
    },
     summaryAdditions: {
       color: theme.colors.success,
     },
     summaryDeletions: {
       color: '#f44336',
     },
  sessionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  childIndicator: {
    fontSize: 14,
    color: '#6c757d',
    marginRight: 4,
  },
   sessionTitle: {
     fontSize: 14,
     color: theme.colors.textPrimary,
     flex: 1,
   },
    sessionTitleRow: {
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
   activeSessionTitle: {
     color: theme.colors.accent,
     fontWeight: '600',
    },
    newSessionTitle: {
      color: theme.colors.success,
      fontWeight: '600',
      textAlign: 'center',
    },
    busySessionTitle: {
      fontWeight: 'bold',
    },
    inlineSummary: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '400',
    },
    titleContainer: {
      flex: 1,
    },
    timeContainer: {
      width: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
   sessionTime: {
     fontSize: 14,
     color: theme.colors.textMuted,
   },
   activeIndicator: {
     marginLeft: 8,
   },
   projectSelector: {
     flex: 1,
     backgroundColor: theme.colors.surfaceSecondary,
     borderWidth: 1,
     borderColor: '#ddd',
     paddingVertical: 12,
     paddingHorizontal: 16,
     marginRight: 8,
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'flex-start',
     gap: 8,
   },
   dropdownIcon: {
     flexShrink: 0,
   },

  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
  },
  dropdownContainer: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    maxHeight: 450,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dropdownHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
    backgroundColor: theme.colors.surface,
  },
   projectList: {
     maxHeight: 450,
     marginTop: 8,
   },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
  },
  activeProjectItem: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderColor: '#1976d2',
    borderWidth: 1,
  },
  projectInfo: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  projectIcon: {
    marginRight: 8,
  },
  projectItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginBottom: 6,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectPath: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },

  vcsBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vcsBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.success,
  },
  lastUpdated: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
    activeProjectTitle: {
     color: theme.colors.accent,
     fontWeight: '600',
   },
   dropdownButton: {
     padding: 4,
     marginRight: 8,
     borderRadius: 4,
     backgroundColor: 'transparent',
   },
   dropdownIcon: {
     alignSelf: 'center',
   },
    childSessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSecondary,
    },
   activeChildSessionItem: {
     backgroundColor: theme.colors.surfaceSecondary,
   },
    childIndent: {
      width: 16,
    },
    childSessionContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
     childSessionTouchable: {
       flex: 1,
       paddingVertical: 16,
       paddingHorizontal: 16,
       flexDirection: 'row',
       alignItems: 'center',
     },
   childSessionTitle: {
     fontSize: 13,
     color: theme.colors.textSecondary,
     flex: 1,
   },
    childSessionTitleRow: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
     childSessionTime: {
       fontSize: 14,
       color: theme.colors.textMuted,
     },
     childSessionMetaRow: {
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'space-between',
       marginTop: 8,
     },
    childSessionSummary: {
      fontSize: 9,
      color: theme.colors.textSecondary,
      marginTop: 1,
      marginBottom: 1,
    },


     skeletonItem: {
       backgroundColor: theme.colors.surfaceSecondary,
     },
     skeletonTitle: {
       height: 16,
       backgroundColor: theme.colors.border,
       borderRadius: 4,
       marginBottom: 4,
     },
     skeletonMeta: {
       height: 14,
       width: 80,
       backgroundColor: theme.colors.border,
       borderRadius: 4,
     },
     skeletonTime: {
       height: 14,
       width: 50,
       backgroundColor: theme.colors.border,
       borderRadius: 4,
     },
  });

export default SessionDrawer;