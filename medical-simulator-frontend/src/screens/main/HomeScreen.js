import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI, casesAPI, healthAPI } from '../../services/api';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [dashboardResponse, casesResponse] = await Promise.all([
        analyticsAPI.getUserDashboard(),
        casesAPI.getCases({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
      ]);

      setDashboardData(dashboardResponse.data);
      setRecentCases(casesResponse.data.cases || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statContent}>
        <View style={styles.statText}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
        <Ionicons name={icon} size={30} color={color} />
      </View>
    </TouchableOpacity>
  );

  const CaseCard = ({ case_item }) => (
    <TouchableOpacity 
      style={styles.caseCard}
      onPress={() => navigation.navigate('Cases', { 
        screen: 'CaseDetail', 
        params: { caseId: case_item._id } 
      })}
    >
      <View style={styles.caseHeader}>
        <Text style={styles.caseTitle} numberOfLines={2}>{case_item.title}</Text>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(case_item.difficulty) }]}>
          <Text style={styles.difficultyText}>{case_item.difficulty}</Text>
        </View>
      </View>
      <Text style={styles.caseSpecialty}>{case_item.specialty}</Text>
      <Text style={styles.caseDescription} numberOfLines={2}>
        {case_item.description}
      </Text>
    </TouchableOpacity>
  );

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.greeting}>
          {getGreeting()}, {user?.profile?.firstName || 'Student'}!
        </Text>
        <Text style={styles.welcomeText}>
          Ready to continue your medical education journey?
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Cases Completed"
            value={dashboardData?.casesCompleted || 0}
            icon="checkmark-circle"
            color="#4CAF50"
            onPress={() => navigation.navigate('Analytics')}
          />
          <StatCard
            title="Average Score"
            value={`${dashboardData?.averageScore || 0}%`}
            icon="trophy"
            color="#FF9800"
            onPress={() => navigation.navigate('Analytics')}
          />
          <StatCard
            title="Study Streak"
            value={`${dashboardData?.studyStreak || 0} days`}
            icon="flame"
            color="#F44336"
            onPress={() => navigation.navigate('Analytics')}
          />
          <StatCard
            title="Time Studied"
            value={`${dashboardData?.totalStudyTime || 0}h`}
            icon="time"
            color="#2196F3"
            onPress={() => navigation.navigate('Analytics')}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Cases')}
          >
            <Ionicons name="medical" size={30} color="#2E86AB" />
            <Text style={styles.actionText}>Browse Cases</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Discussions')}
          >
            <Ionicons name="chatbubbles" size={30} color="#2E86AB" />
            <Text style={styles.actionText}>Discussions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Analytics')}
          >
            <Ionicons name="analytics" size={30} color="#2E86AB" />
            <Text style={styles.actionText}>My Progress</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person" size={30} color="#2E86AB" />
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Cases */}
      <View style={styles.casesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Cases</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Cases')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {recentCases.length > 0 ? (
          recentCases.map((case_item) => (
            <CaseCard key={case_item._id} case_item={case_item} />
          ))
        ) : (
          <Text style={styles.noCasesText}>No cases available</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    backgroundColor: '#2E86AB',
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  welcomeText: {
    fontSize: 16,
    color: '#E3F2FD',
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: (width - 50) / 2,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: (width - 50) / 2,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  casesSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllText: {
    color: '#2E86AB',
    fontSize: 16,
    fontWeight: '500',
  },
  caseCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  caseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  caseSpecialty: {
    fontSize: 14,
    color: '#2E86AB',
    fontWeight: '500',
    marginBottom: 5,
  },
  caseDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noCasesText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
});

export default HomeScreen;