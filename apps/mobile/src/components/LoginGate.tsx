import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens } from '../theme';
import {
  type PendingAction,
  usePendingActionStore,
} from '../store/pending-action';
import { EmptyState } from './EmptyState';

type LoginGateProps = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  /** 去登录前写入，供登录返回后重试。 */
  pendingAction?: PendingAction;
};

export function LoginGate({
  title = '请先登录',
  description = '登录后即可继续操作',
  ctaLabel = '去登录',
  pendingAction,
}: LoginGateProps) {
  const navigation = useNavigation();
  const setPendingAction = usePendingActionStore((s) => s.setPendingAction);

  return (
    <EmptyState
      title={title}
      description={description}
      illustration={
        <MaterialCommunityIcons
          name="account-circle-outline"
          size={64}
          color={tokens.color.textTertiary}
        />
      }
      ctaLabel={ctaLabel}
      onCtaPress={() => {
        if (pendingAction) {
          setPendingAction(pendingAction);
        }
        navigation.navigate('Login');
      }}
    />
  );
}
