import React from 'react';
import { UserProfile } from '../types';
import CMNLHeader from '../../CMNLHeader';

interface AgendaHeaderProps {
  title: string;
  user: UserProfile;
  onMenuClick?: () => void;
  onBack?: () => void;
}

const AgendaHeader: React.FC<AgendaHeaderProps> = ({ title, user, onMenuClick, onBack }) => {
  return (
    <CMNLHeader 
      user={user} 
      sectionTitle={title} 
      onMenuClick={onMenuClick} 
      onBack={onBack}
    />
  );
};

export default AgendaHeader;
