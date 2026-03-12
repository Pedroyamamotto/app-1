import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  subtitleLines?: string[];
  rightContent?: React.ReactNode;
};

export default function AppHeader({ title, subtitle, subtitleLines, rightContent }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        {subtitleLines?.map((line, idx) => (
          <Text key={`${line}-${idx}`} style={styles.headerSubtitle}>{line}</Text>
        ))}
      </View>
      {rightContent ? <View>{rightContent}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#7A1A1A',
    paddingHorizontal: 15,
    paddingVertical: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
  },
});
