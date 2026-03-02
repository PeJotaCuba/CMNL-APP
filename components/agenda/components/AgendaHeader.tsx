import React from 'react';
import { UserProfile } from '../types';
import CMNLHeader from '../../CMNLHeader';

interface AgendaHeaderProps {
  title: string;
  user: UserProfile;
  onMenuClick?: () => void;
}

const AgendaHeader: React.FC<AgendaHeaderProps> = ({ title, user, onMenuClick }) => {
  return (
    <CMNLHeader 
      user={user} 
      sectionTitle={title} 
      onMenuClick={onMenuClick} 
    />
  );
};

export default AgendaHeader;
