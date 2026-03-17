import { useState } from 'react';
import { CampaignsList } from './CampaignsList';
import { CampaignDetail } from './CampaignDetail';

export function UniformsModule() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  if (selectedCampaignId) {
    return (
      <CampaignDetail
        campaignId={selectedCampaignId}
        onBack={() => setSelectedCampaignId(null)}
      />
    );
  }

  return <CampaignsList onSelectCampaign={setSelectedCampaignId} />;
}
