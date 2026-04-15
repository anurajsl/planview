import { useState, useCallback } from 'react';
import Modal from '../common/Modal';
import { useBillingUsage, useCreateCheckout, useCreatePortal } from '../../hooks/useTimeline';
import { useToastStore } from '../../stores/toast.store';
import { billingApi } from '../../api/client';

interface BillingModalProps {
  open: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    tier: 'free', name: 'Free', priceINR: '₹0', priceUSD: '$0', period: 'forever',
    features: ['3 projects', '5 team members', '50 stories/project', 'Dependencies'],
    color: '#94a3b8',
  },
  {
    tier: 'pro', name: 'Pro', priceINR: '₹999', priceUSD: '$12', period: '/user/month',
    features: ['25 projects', '50 team members', '500 stories/project', 'Resource view', 'API access', 'Audit log', 'Data export'],
    color: '#3b82f6', popular: true,
  },
  {
    tier: 'enterprise', name: 'Enterprise', priceINR: 'Custom', priceUSD: 'Custom', period: 'contact us',
    features: ['Unlimited everything', 'SSO (SAML/OIDC)', 'Dedicated support', 'Custom SLA', 'On-premise option'],
    color: '#8b5cf6',
  },
];

declare global {
  interface Window { Razorpay: any; }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BillingModal({ open, onClose }: BillingModalProps) {
  const { data: usage, isLoading } = useBillingUsage();
  const createCheckout = useCreateCheckout();
  const createPortal = useCreatePortal();
  const toast = useToastStore();
  const [upgrading, setUpgrading] = useState(false);

  const handleRazorpayCheckout = useCallback(async (subscriptionId: string, keyId: string) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) { toast.error('Failed to load Razorpay SDK'); return; }

    const options = {
      key: keyId,
      subscription_id: subscriptionId,
      name: 'PlanView',
      description: 'Plan Upgrade',
      handler: async (response: any) => {
        try {
          const result = await billingApi.verifyRazorpay({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (result.verified) {
            toast.success('Plan upgraded successfully');
            onClose();
          } else {
            toast.error('Payment verification failed');
          }
        } catch {
          toast.error('Payment verification failed');
        }
      },
      theme: { color: '#1e3a5f' },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }, [toast, onClose]);

  const handleUpgrade = async (tier: string) => {
    setUpgrading(true);
    try {
      const data = await billingApi.createCheckout({
        planTier: tier,
        billing: 'monthly',
        successUrl: window.location.origin + '/billing/success',
        cancelUrl: window.location.origin,
      });

      if (data.provider === 'razorpay' && data.razorpaySubscriptionId) {
        await handleRazorpayCheckout(data.razorpaySubscriptionId, data.razorpayKeyId);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      toast.error('Failed to create checkout session');
    } finally {
      setUpgrading(false);
    }
  };

  const handleManage = () => {
    createPortal.mutate(
      { returnUrl: window.location.origin },
      {
        onSuccess: (data: any) => { window.location.href = data.portalUrl; },
        onError: () => toast.error('Failed to open billing portal'),
      },
    );
  };

  const currentTier = usage?.planTier || 'free';

  return (
    <Modal open={open} onClose={onClose} title="Plan & Billing">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Current usage */}
        {usage && (
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'var(--bg-hover, #f8fafc)',
            border: '1px solid var(--border, #e5e7eb)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Current Usage — {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Plan
            </div>
            {[
              { label: 'Projects', used: usage.usage.projects, max: usage.limits.maxProjects, pct: usage.percentages.projects },
              { label: 'Team Members', used: usage.usage.users, max: usage.limits.maxUsers, pct: usage.percentages.users },
              { label: 'Stories (largest project)', used: usage.usage.storiesInLargestProject, max: usage.limits.maxStories, pct: usage.percentages.stories },
            ].map(({ label, used, max, pct }) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                    {used} / {max === -1 ? '∞' : max}
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--border, #e5e7eb)' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width 0.3s',
                    width: max === -1 ? '5%' : `${Math.min(100, pct)}%`,
                    background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plan cards */}
        <div style={{ display: 'flex', gap: 10 }}>
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.tier;
            const isDowngrade = PLANS.findIndex((p) => p.tier === currentTier) > PLANS.findIndex((p) => p.tier === plan.tier);

            return (
              <div
                key={plan.tier}
                style={{
                  flex: 1, padding: '14px 12px', borderRadius: 10,
                  border: `2px solid ${isCurrent ? plan.color : 'var(--border, #e5e7eb)'}`,
                  background: isCurrent ? plan.color + '08' : 'var(--bg-surface, #fff)',
                  position: 'relative',
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -10, right: 12,
                    fontSize: 9, fontWeight: 700, color: '#fff',
                    background: plan.color, padding: '2px 8px', borderRadius: 4,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>Popular</div>
                )}

                <div style={{ fontSize: 14, fontWeight: 700, color: plan.color, marginBottom: 2 }}>{plan.name}</div>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{plan.priceINR}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> {plan.period}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span style={{ color: plan.color, fontWeight: 700, fontSize: 10 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <button
                    onClick={handleManage}
                    style={{
                      width: '100%', padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${plan.color}40`, background: 'transparent',
                      color: plan.color, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Manage
                  </button>
                ) : plan.tier === 'enterprise' ? (
                  <button
                    style={{
                      width: '100%', padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${plan.color}40`, background: 'transparent',
                      color: plan.color, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onClick={() => toast.info('Contact sales@planview.app for Enterprise pricing')}
                  >
                    Contact Sales
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.tier)}
                    disabled={upgrading || isDowngrade}
                    style={{
                      width: '100%', padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: 'none', background: plan.color, color: '#fff',
                      cursor: upgrading ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', opacity: isDowngrade ? 0.4 : 1,
                    }}
                  >
                    {isDowngrade ? 'Manage to downgrade' : upgrading ? 'Loading...' : 'Upgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
