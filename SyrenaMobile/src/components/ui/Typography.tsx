import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { theme, typography } from '../../theme';

type TypographyVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'h6'
  | 'body1' 
  | 'body2' 
  | 'subtitle1' 
  | 'subtitle2'
  | 'caption' 
  | 'overline'
  | 'display1'
  | 'display2';

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  color = theme.colors.textPrimary,
  align = 'left',
  weight,
  style,
  children,
  ...props
}) => {
  const getVariantStyles = (): TextStyle => {
    switch (variant) {
      case 'display1':
        return {
          fontFamily: typography.fonts.display.regular,
          fontSize: typography.sizes.display1,
          lineHeight: typography.sizes.display1 * typography.lineHeights.tight,
          fontWeight: '700',
          letterSpacing: typography.letterSpacing.tight,
        };
      case 'display2':
        return {
          fontFamily: typography.fonts.display.regular,
          fontSize: typography.sizes.display2,
          lineHeight: typography.sizes.display2 * typography.lineHeights.tight,
          fontWeight: '700',
          letterSpacing: typography.letterSpacing.tight,
        };
      case 'h1':
        return {
          fontFamily: typography.fonts.heading.regular,
          fontSize: typography.sizes.xxxl,
          lineHeight: typography.sizes.xxxl * typography.lineHeights.tight,
          fontWeight: '700',
          letterSpacing: typography.letterSpacing.tight,
        };
      case 'h2':
        return {
          fontFamily: typography.fonts.heading.regular,
          fontSize: typography.sizes.xxl,
          lineHeight: typography.sizes.xxl * typography.lineHeights.tight,
          fontWeight: '600',
          letterSpacing: typography.letterSpacing.tight,
        };
      case 'h3':
        return {
          fontFamily: typography.fonts.heading.regular,
          fontSize: typography.sizes.xl,
          lineHeight: typography.sizes.xl * typography.lineHeights.snug,
          fontWeight: '600',
        };
      case 'h4':
        return {
          fontFamily: typography.fonts.heading.regular,
          fontSize: typography.sizes.lg,
          lineHeight: typography.sizes.lg * typography.lineHeights.snug,
          fontWeight: '600',
        };
      case 'h5':
        return {
          fontFamily: typography.fonts.heading.regular,
          fontSize: typography.sizes.md,
          lineHeight: typography.sizes.md * typography.lineHeights.normal,
          fontWeight: '600',
        };
      case 'h6':
        return {
          fontFamily: typography.fonts.heading.regular,
          fontSize: typography.sizes.base,
          lineHeight: typography.sizes.base * typography.lineHeights.normal,
          fontWeight: '600',
        };
      case 'subtitle1':
        return {
          fontFamily: typography.fonts.body.regular,
          fontSize: typography.sizes.md,
          lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
          fontWeight: '500',
          letterSpacing: typography.letterSpacing.wide,
        };
      case 'subtitle2':
        return {
          fontFamily: typography.fonts.body.regular,
          fontSize: typography.sizes.base,
          lineHeight: typography.sizes.base * typography.lineHeights.relaxed,
          fontWeight: '500',
          letterSpacing: typography.letterSpacing.wide,
        };
      case 'body1':
        return {
          fontFamily: typography.fonts.body.regular,
          fontSize: typography.sizes.base,
          lineHeight: typography.sizes.base * typography.lineHeights.normal,
          fontWeight: '400',
        };
      case 'body2':
        return {
          fontFamily: typography.fonts.body.regular,
          fontSize: typography.sizes.sm,
          lineHeight: typography.sizes.sm * typography.lineHeights.normal,
          fontWeight: '400',
        };
      case 'caption':
        return {
          fontFamily: typography.fonts.body.regular,
          fontSize: typography.sizes.xs,
          lineHeight: typography.sizes.xs * typography.lineHeights.normal,
          fontWeight: '400',
          letterSpacing: typography.letterSpacing.wide,
        };
      case 'overline':
        return {
          fontFamily: typography.fonts.body.regular,
          fontSize: typography.sizes.xxs,
          lineHeight: typography.sizes.xxs * typography.lineHeights.loose,
          fontWeight: '600',
          letterSpacing: typography.letterSpacing.widest,
          textTransform: 'uppercase',
        };
      default:
        return styles.body1;
    }
  };

  const getWeightOverride = () => {
    if (!weight) return {};

    return {
      fontWeight: typography.weights[weight] as '400' | '500' | '600' | '700',
    };
  };

  return (
    <Text
      style={[
        getVariantStyles(),
        { color, textAlign: align },
        getWeightOverride(),
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  body1: {
    fontFamily: typography.fonts.body.regular,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
    fontWeight: '400',
  },
});