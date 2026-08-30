import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AddressInput } from '@lightbuy/shared';
import { Button, Checkbox, Text, TextInput } from 'react-native-paper';

import { createAddress, listAddresses, updateAddress } from '../api/address';
import { isApiError } from '../api/errors';
import {
  EmptyState,
  LoginGate,
  RegionPicker,
  RowListSkeleton,
} from '../components';
import type { RegionValue } from '../components';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth';
import { useToastStore } from '../store/toast';
import { tokens } from '../theme';

type AddressEditRoute = RouteProp<RootStackParamList, 'AddressEdit'>;
type AddressEditNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'AddressEdit'
>;

const EMPTY_FORM: AddressInput = {
  receiverName: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
};

export function AddressEditScreen() {
  const route = useRoute<AddressEditRoute>();
  const navigation = useNavigation<AddressEditNavigation>();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const showToast = useToastStore((state) => state.show);
  const addressId = route.params?.addressId;
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(Boolean(addressId));
  const [notFound, setNotFound] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    let active = true;
    if (!addressId || !user) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }
    setIsLoading(true);
    void listAddresses()
      .then((items) => {
        if (!active) {
          return;
        }
        const address = items.find((item) => item.id === addressId);
        if (!address) {
          setNotFound(true);
          return;
        }
        setForm({
          receiverName: address.receiverName,
          phone: address.phone,
          province: address.province,
          city: address.city,
          district: address.district,
          detail: address.detail,
          isDefault: address.isDefault,
        });
      })
      .catch(() => {
        if (active) {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [addressId, user]);

  function updateField<K extends keyof AddressInput>(
    key: K,
    value: AddressInput[K],
  ) {
    setFieldError('');
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const receiverName = form.receiverName.trim();
    const phone = form.phone.trim();
    const detail = form.detail.trim();
    if (
      !receiverName ||
      !detail ||
      !form.province ||
      !form.city ||
      !form.district
    ) {
      setFieldError('请完整填写收货地址');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setFieldError('请输入正确的手机号');
      return;
    }
    const input: AddressInput = {
      ...form,
      receiverName,
      phone,
      detail,
    };
    setIsSaving(true);
    try {
      if (addressId) {
        await updateAddress(addressId, input);
      } else {
        await createAddress(input);
      }
      showToast(addressId ? '地址已更新' : '地址已新增');
      navigation.goBack();
    } catch (error) {
      showToast(isApiError(error) ? error.message : '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }

  if (isHydrating) {
    return <View style={styles.page} />;
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <LoginGate
          title="登录后编辑收货地址"
          description="收货地址仅保存在你的账号中"
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.page}>
        <RowListSkeleton rows={2} />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="地址不存在"
          description="该地址可能已被删除"
          ctaLabel="返回"
          onCtaPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  const region: RegionValue = {
    province: form.province,
    city: form.city,
    district: form.district,
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          mode="outlined"
          label="收货人"
          value={form.receiverName}
          maxLength={32}
          onChangeText={(value) => updateField('receiverName', value)}
        />
        <TextInput
          mode="outlined"
          label="手机号"
          value={form.phone}
          maxLength={11}
          keyboardType="phone-pad"
          onChangeText={(value) => updateField('phone', value)}
        />
        <RegionPicker
          value={region}
          onChange={(value) => setForm((current) => ({ ...current, ...value }))}
        />
        <TextInput
          mode="outlined"
          label="详细地址"
          value={form.detail}
          maxLength={128}
          multiline
          numberOfLines={3}
          onChangeText={(value) => updateField('detail', value)}
        />
        <Checkbox.Item
          label="设为默认地址"
          status={form.isDefault ? 'checked' : 'unchecked'}
          onPress={() => updateField('isDefault', !form.isDefault)}
          style={styles.checkbox}
        />
        {fieldError ? <Text style={styles.error}>{fieldError}</Text> : null}
        <Button
          mode="contained"
          loading={isSaving}
          disabled={isSaving}
          onPress={() => void save()}
          contentStyle={styles.buttonContent}
        >
          保存
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
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
  form: {
    padding: tokens.space.lg,
    gap: tokens.space.lg,
  },
  checkbox: {
    minHeight: tokens.minTouch,
    paddingHorizontal: 0,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.input,
  },
  error: {
    color: tokens.color.error,
  },
  buttonContent: {
    minHeight: tokens.minTouch,
  },
});
