import React, { useState, useEffect } from 'react';
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
  const { challengeId, platform, timestamp, challenge, apiEndpoint, employeeName, employeeId } = route.params;
  const { employees, submitAuthResponse } = useWallet();
  const { isConnected } = useNetwork();
  
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      Alert.alert(
        'Not Connected',
        'No connection to backend. Please check your network settings.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [isConnected]);

  const handleConfirm = async () => {
    if (!selectedEmployee) {
      Alert.alert('Error', 'Please select an employee');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await submitAuthResponse(challengeId, selectedEmployee, challenge, apiEndpoint);
      
      if (result.success) {
        Alert.alert(
          'Authentication Successful',
          'You have been authenticated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      } else {
        Alert.alert('Authentication Failed', result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit authentication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Authentication',
      'Are you sure you want to cancel this authentication request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => navigation.navigate('Home'),
        },
      ]
    );
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  if (employees.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No Employees</Text>
          <Text style={styles.emptyText}>
            You need to add employees before you can authenticate.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.buttonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Request Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Authentication Request</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Platform:</Text>
          <Text style={styles.value}>{platform}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{formatTimestamp(timestamp)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Challenge ID:</Text>
          <Text style={styles.valueSmall} numberOfLines={1}>{challengeId}</Text>
        </View>
      </View>

      {/* Employee Selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select Employee</Text>
        <Text style={styles.subtitle}>
          Choose which employee identity to use for this authentication
        </Text>
        
        {employees.map((employee) => (
          <TouchableOpacity
            key={employee.id}
            style={[
              styles.employeeCard,
              selectedEmployee === employee.did && styles.employeeCardSelected,
            ]}
            onPress={() => setSelectedEmployee(employee.did)}
          >
            <View style={styles.employeeHeader}>
              <View style={styles.radioButton}>
                {selectedEmployee === employee.did && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{employee.name}</Text>
                <Text style={styles.employeeRole}>{employee.role}</Text>
              </View>
            </View>
            <Text style={styles.employeeDid} numberOfLines={1}>
              {employee.did}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton, !selectedEmployee && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={!selectedEmployee || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>✓ Confirm</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={handleCancel}
          disabled={isSubmitting}
        >
          <Text style={styles.actionButtonText}>✗ Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Security Notice */}
      <View style={styles.noticeCard}>
        <Text style={styles.noticeText}>
          🔒 Your private key will be used to sign this authentication request. 
          Never share your private key with anyone.
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
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
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
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
  employeeCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  employeeCardSelected: {
    borderColor: '#0ea5e9',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0ea5e9',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 14,
    color: '#0ea5e9',
  },
  employeeDid: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 36,
  },
  actions: {
    marginBottom: 20,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButton: {
    backgroundColor: '#22c55e',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  button: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  noticeCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  noticeText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
});

export default AuthConfirmationScreen;
