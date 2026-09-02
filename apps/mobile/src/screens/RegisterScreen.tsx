import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { trackClick, trackLoginSucceeded } from '../analytics';
import { register } from '../api/auth';
import { isApiError } from '../api/errors';
import { persistSession } from '../auth/session';
import type { RootStackParamList } from '../navigation/types';
import { tokens } from '../theme';
import { canTrackAuthClick } from './auth-tracking';
import { validatePassword, validatePhone } from './auth-validation';
import { dismissAuthScreens } from './dismiss-auth';

export function RegisterScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    const nextPhoneError = validatePhone(phone);
    const nextPasswordError = validatePassword(password);
    const nextConfirmError =
      confirmPassword !== password ? '两次输入的密码不一致' : undefined;
    setPhoneError(nextPhoneError);
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    setFormError(undefined);
    if (
      !canTrackAuthClick(nextPhoneError, nextPasswordError, nextConfirmError)
    ) {
      return;
    }
    trackClick('register', 'register');

    setSubmitting(true);
    try {
      const data = await register({ phone, password, confirmPassword });
      await persistSession(data);
      trackLoginSucceeded('password');
      dismissAuthScreens(navigation);
    } catch (error) {
      setFormError(isApiError(error) ? error.message : '注册失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.page}>
      <Text variant="headlineSmall" style={styles.title}>
        注册
      </Text>
      <TextInput
        mode="outlined"
        label="手机号"
        value={phone}
        onChangeText={setPhone}
        keyboardType="number-pad"
        maxLength={11}
        autoCapitalize="none"
        error={Boolean(phoneError)}
      />
      <HelperText type="error" visible={Boolean(phoneError)}>
        {phoneError}
      </HelperText>
      <TextInput
        mode="outlined"
        label="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={Boolean(passwordError)}
      />
      <HelperText type="error" visible={Boolean(passwordError)}>
        {passwordError}
      </HelperText>
      <TextInput
        mode="outlined"
        label="确认密码"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        error={Boolean(confirmError)}
      />
      <HelperText type="error" visible={Boolean(confirmError)}>
        {confirmError}
      </HelperText>
      {formError ? (
        <HelperText type="error" visible>
          {formError}
        </HelperText>
      ) : null}
      <Button
        mode="contained"
        onPress={() => void onSubmit()}
        loading={submitting}
        disabled={submitting}
        contentStyle={styles.ctaContent}
      >
        注册
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  title: {
    color: tokens.color.textPrimary,
    marginBottom: tokens.space.sm,
  },
  ctaContent: {
    minHeight: tokens.minTouch,
  },
});
