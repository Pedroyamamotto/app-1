import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ReactNode } from 'react';
import { Linking, Text, type TextProps } from 'react-native';

type Props = Omit<TextProps, 'onPress'> & { href: string; children?: ReactNode };

export function ExternalLink({ href, children, ...rest }: Props) {
  const handlePress = async () => {
    if (process.env.EXPO_OS !== 'web') {
      await openBrowserAsync(href, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
      return;
    }

    await Linking.openURL(href);
  };

  return (
    <Text {...rest} onPress={handlePress}>
      {children}
    </Text>
  );
}
