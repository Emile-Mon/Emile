'use client';

import React from 'react';
import { PreparingLaunchCard, PreparingLaunchData } from './PreparingLaunchCard';

export const SecondLaunchCountdownCard: React.FC = () => {
  const zuluData: PreparingLaunchData = {
    launch_id: 8,
    day_index: 1,
    cycle_id: 1419,
    run_id: 444,
    candidate_id: 2,
    name: 'twenty hundred Zulu',
    symbol: '2000Z',
    mint: '0xa8c561693ca146fa515cff72c73ac2c463c956dc',
    image_url: '/2000z-logo.jpeg',
    dexscreener_url: 'https://dexscreener.com/robinhood/0xa8c561693ca146fa515cff72c73ac2c463c956dc',
    lore: `In aviation, maritime, and military convention, Coordinated Universal Time is spoken as Zulu, and 20:00 is read as twenty hundred. So 2000Z is said aloud exactly as it is written here: twenty hundred Zulu.

This is the correct radio reading, not a stylisation, which is the point. The name is a coordinate spoken the way operators speak it, by people whose job depends on everyone meaning the same instant.`,
    launch_hour: 20,
    rank_in_cycle: 1,
    predicted_prob: 0.8420,
    prediction_sha: '0xa8c561693ca146fa515cff72c73ac2c463c956dc',
    prediction_at: '2026-09-15T20:00:00Z',
    status: 'LAUNCHED : 0xa8c561693ca146fa515cff72c73ac2c463c956dc',
    authorship: {
      name: 'human',
      lore: 'model',
      hour: 'model',
      holders: 'market'
    },
    contributions: [
      { feature: 'launch_hour_cos', label: 'Launch hour 20:00 UTC', value: 0.245 },
      { feature: 'lore_length', label: 'Lore length 315 characters', value: 0.088 },
      { feature: 'name_tokens', label: 'Name token count 3', value: 0.035 },
      { feature: 'holders', label: 'Holder count (held at median)', value: 0.000 }
    ],
    why_text: 'The model selected twenty hundred Zulu ($2000Z) from 100 candidates written in The Brain. Launch hour 20:00 UTC carries the strongest signal (+0.245), and lore length contributed +0.088.'
  };

  return <PreparingLaunchCard data={zuluData} />;
};
