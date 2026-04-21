import { useState } from 'react';
import { CheerCampaignsList } from './CheerCampaignsList';
import { CheerCampaignDetail } from './CheerCampaignDetail';

export function CheerModule() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return (
      <CheerCampaignDetail
        campaignId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return <CheerCampaignsList onSelectCampaign={setSelectedId} />;
}
