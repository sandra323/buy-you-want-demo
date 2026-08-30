import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, List, Portal, Text } from 'react-native-paper';

import { cnRegions } from '../data/cn-regions';
import { tokens } from '../theme';

type RegionLevel = 'province' | 'city' | 'district';

export type RegionValue = {
  province: string;
  city: string;
  district: string;
};

type RegionPickerProps = {
  value: RegionValue;
  onChange: (value: RegionValue) => void;
};

const LEVEL_LABEL: Record<RegionLevel, string> = {
  province: '选择省份',
  city: '选择城市',
  district: '选择区县',
};

export function RegionPicker({ value, onChange }: RegionPickerProps) {
  const [level, setLevel] = useState<RegionLevel | null>(null);
  const options = useMemo(() => {
    if (level === 'province') {
      return Object.keys(cnRegions);
    }
    if (level === 'city' && value.province) {
      return Object.keys(cnRegions[value.province] ?? {});
    }
    if (level === 'district' && value.province && value.city) {
      return cnRegions[value.province]?.[value.city] ?? [];
    }
    return [];
  }, [level, value.city, value.province]);

  function select(option: string) {
    if (level === 'province') {
      const city = Object.keys(cnRegions[option] ?? {})[0] ?? '';
      const district = cnRegions[option]?.[city]?.[0] ?? '';
      onChange({ province: option, city, district });
    } else if (level === 'city') {
      onChange({
        province: value.province,
        city: option,
        district: cnRegions[value.province]?.[option]?.[0] ?? '',
      });
    } else if (level === 'district') {
      onChange({ ...value, district: option });
    }
    setLevel(null);
  }

  return (
    <View style={styles.wrap}>
      <Text variant="labelLarge">所在地区</Text>
      <View style={styles.row}>
        <Button mode="outlined" onPress={() => setLevel('province')}>
          {value.province || '省份'}
        </Button>
        <Button
          mode="outlined"
          disabled={!value.province}
          onPress={() => setLevel('city')}
        >
          {value.city || '城市'}
        </Button>
        <Button
          mode="outlined"
          disabled={!value.city}
          onPress={() => setLevel('district')}
        >
          {value.district || '区县'}
        </Button>
      </View>
      <Portal>
        <Dialog visible={level !== null} onDismiss={() => setLevel(null)}>
          <Dialog.Title>{level ? LEVEL_LABEL[level] : ''}</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogArea}>
            <ScrollView>
              {options.map((option) => (
                <List.Item
                  key={option}
                  title={option}
                  onPress={() => select(option)}
                />
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setLevel(null)}>取消</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  dialogArea: {
    maxHeight: 420,
    paddingHorizontal: 0,
  },
});
