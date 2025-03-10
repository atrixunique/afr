import { cssVar } from '@toeverything/theme';
import { style } from '@vanilla-extract/css';

export const paymentMethod = style({
  marginTop: '24px',
});

export const history = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '24px',
});
export const historyContent = style({
  width: '100%',
});

export const noInvoice = style({
  color: cssVar('textSecondaryColor'),
  fontSize: cssVar('fontXs'),
});

export const subscriptionSettingSkeleton = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
});

export const billingHistorySkeleton = style({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '72px',
  alignItems: 'center',
  justifyContent: 'center',
});

export const planCard = style({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '12px',
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '8px',
});

export const currentPlan = style({
  flex: '1 0 0',
});

export const planPrice = style({
  fontSize: cssVar('fontH6'),
  fontWeight: 600,
});

export const billingFrequency = style({
  fontSize: cssVar('fontBase'),
});

export const currentPlanName = style({
  fontSize: cssVar('fontXs'),
  fontWeight: 500,
  color: cssVar('textEmphasisColor'),
  cursor: 'pointer',
});

export const cancelPlanButton = style({
  marginTop: '8px',
});
