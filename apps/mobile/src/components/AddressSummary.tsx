import { StyleSheet, View } from 'react-native';
import type { Address } from '@lightbuy/shared';
import { Text } from 'react-native-paper';

import { tokens } from '../theme';

type AddressSummaryProps = {
  address: Address;
};

export function AddressSummary({ address }: AddressSummaryProps) {
  return (
    <View accessibilityLabel="ph-no-capture" style={styles.body}>
      <View style={styles.person}>
        <Text variant="titleSmall">{address.receiverName}</Text>
        <Text style={styles.phone}>{address.phone}</Text>
      </View>
      <Text style={styles.detail}>
        {address.province}
        {address.city}
        {address.district}
        {address.detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: tokens.space.sm,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  phone: {
    color: tokens.color.textSecondary,
  },
  detail: {
    color: tokens.color.textSecondary,
    lineHeight: 20,
  },
});
