import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useBreadcrumbNavigation from '@/shared/hooks/useBreadcrumbNavigation';
import { formatBreadcrumbText } from '@/shared/utils/breadcrumbUtils';

/**
 * BreadcrumbNavigation component - Static horizontal bar visualization for breadcrumbs
 * @param {Object} props - Component props
 */
const BreadcrumbNavigation = () => {
  const { breadcrumbs, navigate } = useBreadcrumbNavigation();

  return (
    <View style={styles.container}>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.path}>
          <TouchableOpacity onPress={() => navigate(crumb.path)}>
            <Text style={styles.crumb}>{formatBreadcrumbText(crumb)}</Text>
          </TouchableOpacity>
          {index < breadcrumbs.length - 1 && <Text style={styles.separator}>›</Text>}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  crumb: { fontSize: 14, color: '#007bff' },
  separator: { fontSize: 16, color: '#666', marginHorizontal: 5 },
});

export default BreadcrumbNavigation;