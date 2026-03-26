import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useWallet } from '../context/WalletContext';
import { useNetwork } from '../context/NetworkContext';

type AuthConfirmationRouteProp = RouteProp<RootStackParamList, 'AuthConfirmation'>;

const AuthConfirmationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AuthConfirmationRouteProp>();
  const {
    challengeId,
    platform,
    timestamp,
    challenge,
    apiEndpoint,
    employeeName,
    employeeId,
    expectedDID,
    badgeType,
    badgePermissions,
    employeeHashId,
  } = route.params;
  const { did, employees, submitAuthResponse } = useWallet();
  const { isConnected } = useNetwork();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resolvedEmployeeDID = useMemo(() => {
    if (expectedDID) return expectedDID;
    if (employeeId) {
      const match = employees.find((employee) => employee.id === employeeId);
      if (match?.did) return match.did;
    }
    return did || '';
  }, [did, employeeId, employees, expectedDID]);

  useEffect(() => {
    if (!isConnected) {
      Alert.alert(
        'Not Connected',
        'No connection to backend. Please check your network settings.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (submitted || isSubmitting) return;
    if (!resolvedEmployeeDID) return;

    void handleAutoConfirm();
  }, [isConnected, resolvedEmployeeDID]);

  const handleAutoConfirm = async () => {
    setIsSubmitting(true);

    try {
      const result = await submitAuthResponse(
        challengeId,
        resolvedEmployeeDID,
        challenge,
        apiEndpoint,
        employeeId,
      );

      if (result.success) {
        setSubmitted(true);
        Alert.alert(
          'Authentication Successful',
          `${employeeName || employeeId || 'Employee'} authenticated with ${String(badgeType || 'employee').toUpperCase()} badge.`,
          [
            {
              text: 'OK',
              onPress: () => undefined,
            },
          ]
        );
      } else {
        Alert.alert('Authentication Failed', result.error || 'Unknown error occurred', [
          { text: 'Back', onPress: () => navigation.navigate('Home' as never) },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit authentication', [
        { text: 'Back', onPress: () => navigation.navigate('Home' as never) },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.navigate('Home' as never);
  };

  const formatTimestamp = (ts: string | number | undefined) => {
    if (!ts) return 'Not provided';
    
    const raw = String(ts).trim();
    if (!raw) return 'Not provided';

    // Try to parse as number (epoch) or ISO string
    const numeric = Number(raw);
    let candidate: Date;
    
    if (Number.isFinite(numeric)) {
      // If number is less than 10 digits, assume seconds; otherwise milliseconds
      candidate = new Date(raw.length <= 10 ? numeric * 1000 : numeric);
    } else {
      // Try parsing as ISO string
      candidate = new Date(raw);
    }

    // Check if date is valid
    if (Number.isNaN(candidate.getTime())) {
      console.warn('Invalid timestamp:', raw);
      return 'Invalid Date';
    }

    return candidate.toLocaleString();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Employee-bound Authentication</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Platform:</Text>
          <Text style={styles.value}>{platform}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Employee:</Text>
          <Text style={styles.value}>{employeeName || employeeId || 'Unknown'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Badge:</Text>
          <Text style={styles.value}>{String(badgeType || 'employee').toUpperCase()}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{formatTimestamp(String(timestamp))}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Hash ID:</Text>
          <Text style={styles.valueSmall} numberOfLines={1}>{employeeHashId || '-'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>DID used:</Text>
          <Text style={styles.valueSmall} numberOfLines={1}>{resolvedEmployeeDID || '-'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Digital Badge Permissions</Text>
        {(badgePermissions || []).length === 0 ? (
          <Text style={styles.emptyText}>No badge permissions provided in QR payload.</Text>
        ) : (
          (badgePermissions || []).map((permission) => (
            <View key={permission} style={styles.permissionChip}>
              <Text style={styles.permissionText}>{permission}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleAutoConfirm}
          disabled={isSubmitting || submitted}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>{submitted ? 'Completed' : 'Retry Authentication'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={handleCancel}
          disabled={isSubmitting}
        >
          <Text style={styles.actionButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeText}>
          Wallet auto-resolves the employee from QR and authenticates directly. No manual employee selection is required.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
  },
  value: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  valueSmall: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    maxWidth: '60%',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  permissionChip: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: '#0ea5e9',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  permissionText: {
    color: '#bae6fd',
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    marginBottom: 20,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#475569',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  noticeCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22c55e',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
  },
  noticeText: {
    color: '#86efac',
    fontSize: 13,
    lineHeight: 19,
  },
});

export default AuthConfirmationScreen;
