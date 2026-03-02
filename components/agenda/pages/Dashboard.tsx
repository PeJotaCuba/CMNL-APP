import React from 'react';
import Home from './Home';
import { UserProfile, Program } from '../types';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  programs: Program[];
  onSync: () => Promise<boolean>;
  filterEnabled: boolean;
  onToggleFilter: () => void;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
  return <Home {...props} />;
};

export default Dashboard;
