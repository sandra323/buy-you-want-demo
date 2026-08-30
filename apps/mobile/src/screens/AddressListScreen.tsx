import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Address, AddressInput } from '@lightbuy/shared';
import { Button, Chip, Dialog, Portal, Text } from 'react-native-paper';

import { deleteAddress, listAddresses, updateAddress } from '../api/address';
import { isApiError } from '../api/errors';
import { AddressSummary, EmptyState, LoginGate } from '../components';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth';
import { useToastStore } from '../store/toast';
import { tokens } from '../theme';

type AddressNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'AddressList'
>;

function toInput(
  address: Address,
  isDefault = address.isDefault,
): AddressInput {
  return {
    receiverName: address.receiverName,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.detail,
    isDefault,
  };
}

export function AddressListScreen() {
  const navigation = useNavigation<AddressNavigation>();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const showToast = useToastStore((state) => state.show);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      setAddresses(await listAddresses());
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void load();
      }
      return undefined;
    }, [load, user]),
  );

  async function makeDefault(address: Address) {
    setBusyId(address.id);
    try {
      await updateAddress(address.id, toInput(address, true));
      await load();
    } catch (error) {
      showToast(isApiError(error) ? error.message : '设置默认地址失败');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    const id = pendingDelete.id;
    setPendingDelete(null);
    setBusyId(id);
    try {
      await deleteAddress(id);
      await load();
    } catch (error) {
      showToast(isApiError(error) ? error.message : '删除地址失败');
    } finally {
      setBusyId(null);
    }
  }

  if (isHydrating) {
    return <View style={styles.page} />;
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <LoginGate
          title="登录后管理收货地址"
          description="收货地址仅保存在你的账号中"
        />
      </View>
    );
  }

  if (loadFailed && addresses === null) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="地址加载失败"
          description="请检查网络后重试"
          ctaLabel="重试"
          onCtaPress={() => void load()}
        />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <FlatList
        data={addresses ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          addresses?.length === 0 && styles.emptyList,
        ]}
        refreshing={addresses === null}
        onRefresh={() => void load()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable
              onPress={() =>
                navigation.navigate('AddressEdit', { addressId: item.id })
              }
              style={styles.summary}
            >
              <AddressSummary address={item} />
              {item.isDefault ? <Chip compact>默认</Chip> : null}
            </Pressable>
            <View style={styles.actions}>
              {!item.isDefault ? (
                <Button
                  compact
                  disabled={busyId === item.id}
                  onPress={() => void makeDefault(item)}
                >
                  设为默认
                </Button>
              ) : (
                <Text style={styles.defaultHint}>默认地址</Text>
              )}
              <Button
                compact
                disabled={busyId === item.id}
                onPress={() =>
                  navigation.navigate('AddressEdit', { addressId: item.id })
                }
              >
                编辑
              </Button>
              <Button
                compact
                textColor={tokens.color.error}
                disabled={busyId === item.id}
                onPress={() => setPendingDelete(item)}
              >
                删除
              </Button>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="还没有收货地址"
            description="新增地址后即可用于结算"
            illustration={
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={64}
                color={tokens.color.textTertiary}
              />
            }
            ctaLabel="新增地址"
            onCtaPress={() => navigation.navigate('AddressEdit', {})}
          />
        }
      />
      {(addresses?.length ?? 0) > 0 ? (
        <View style={styles.footer}>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => navigation.navigate('AddressEdit', {})}
            contentStyle={styles.buttonContent}
          >
            新增地址
          </Button>
        </View>
      ) : null}
      <Portal>
        <Dialog
          visible={pendingDelete !== null}
          onDismiss={() => setPendingDelete(null)}
        >
          <Dialog.Title>删除收货地址？</Dialog.Title>
          <Dialog.Content>
            <Text>删除后无法恢复。</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPendingDelete(null)}>取消</Button>
            <Button
              textColor={tokens.color.error}
              onPress={() => void confirmDelete()}
            >
              删除
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: tokens.color.background,
  },
  list: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.surface,
  },
  summary: {
    minHeight: tokens.minTouch,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.sm,
  },
  actions: {
    minHeight: tokens.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.color.line,
    paddingTop: tokens.space.sm,
  },
  defaultHint: {
    marginRight: 'auto',
    color: tokens.color.textTertiary,
  },
  footer: {
    padding: tokens.space.md,
    backgroundColor: tokens.color.surface,
  },
  buttonContent: {
    minHeight: tokens.minTouch,
  },
});
