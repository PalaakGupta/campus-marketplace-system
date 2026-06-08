import { FiCheckCircle } from 'react-icons/fi';
import './PaymentTimeline.css';

const STEPS = [
  { id: 'paid',      label: 'Paid' },
  { id: 'vault',     label: 'In Vault' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'released',  label: 'Released' },
];

const STATUS_STEP_MAP = {
  holding:  2,
  released: 4,
  refunded: 3,
};

export default function PaymentTimeline({ paymentStatus }) {
  const activeStep = STATUS_STEP_MAP[paymentStatus] ?? 1;

  return (
    <div className="payment-timeline">
      {STEPS.map((step, i) => {
        const stepNum = i + 1;
        const done = stepNum <= activeStep;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={step.id} className={`payment-timeline__item ${!isLast ? 'payment-timeline__item--connector' : ''}`}>
            <div className="payment-timeline__step">
              <div className={`payment-timeline__dot ${done ? 'payment-timeline__dot--done' : ''}`}>
                {done
                  ? <FiCheckCircle size={12} />
                  : <span className="payment-timeline__dot-inner" />
                }
              </div>
              <span className={`payment-timeline__label ${done ? 'payment-timeline__label--done' : ''}`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`payment-timeline__line ${done ? 'payment-timeline__line--done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}