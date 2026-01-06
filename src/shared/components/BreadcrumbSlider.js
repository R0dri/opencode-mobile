import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import useBreadcrumbNavigation from '@/shared/hooks/useBreadcrumbNavigation';
import { formatBreadcrumbText } from '@/shared/utils/breadcrumbUtils';

/**
 * BreadcrumbSlider component - Interactive slidable visualization for breadcrumbs
 * @param {Object} props - Component props
 */
const BreadcrumbSlider = () => {
  const { breadcrumbs, navigate } = useBreadcrumbNavigation();

  return (
    <ScrollView horizontal style={styles.container}>
      {breadcrumbs.map((crumb, index) => (
        <TouchableOpacity key={crumb.path} onPress={() => navigate(crumb.path)} style={styles.crumb}>
          <Text style={styles.text}>{formatBreadcrumbText(crumb)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 10 },
  crumb: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f0f0f0', marginRight: 5, borderRadius: 5 },
  text: { fontSize: 14 },
});

export default BreadcrumbSlider;