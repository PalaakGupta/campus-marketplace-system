import { FiCircle } from "react-icons/fi";

const STATUS_MAP = {
  // Item statuses
  available:  { cls: "ad-badge--green",  label: "Available"  },
  reserved:   { cls: "ad-badge--amber",  label: "Reserved"   },
  sold:       { cls: "ad-badge--gray",   label: "Sold"       },
  removed:    { cls: "ad-badge--red",    label: "Removed"    },
  flagged:    { cls: "ad-badge--orange", label: "Flagged"    },
  // Holding statuses
  holding:    { cls: "ad-badge--amber",  label: "In Vault"   },
  released:   { cls: "ad-badge--green",  label: "Released"   },
  refunded:   { cls: "ad-badge--purple", label: "Refunded"   },
  // Tx types
  purchase:   { cls: "ad-badge--blue",   label: "Purchase"   },
  release:    { cls: "ad-badge--green",  label: "Release"    },
  refund:     { cls: "ad-badge--purple", label: "Refund"     },
  // Report / support statuses
  pending:    { cls: "ad-badge--amber",  label: "Pending"    },
  resolved:   { cls: "ad-badge--green",  label: "Resolved"   },
  dismissed:  { cls: "ad-badge--gray",   label: "Dismissed"  },
  open:       { cls: "ad-badge--red",    label: "Open"       },
  closed:     { cls: "ad-badge--gray",   label: "Closed"     },
  // Report categories
  scam:            { cls: "ad-badge--red",    label: "Scam"       },
  fake_listing:    { cls: "ad-badge--orange", label: "Fake Listing"},
  inappropriate:   { cls: "ad-badge--pink",   label: "Inappropriate"},
  harassment:      { cls: "ad-badge--rose",   label: "Harassment" },
  spam:            { cls: "ad-badge--amber",  label: "Spam"       },
  // Support categories
  help_request:    { cls: "ad-badge--sky",    label: "Help"       },
  technical_issue: { cls: "ad-badge--indigo", label: "Technical"  },
  account_access:  { cls: "ad-badge--teal",   label: "Account"    },
  marketplace_issue:{ cls: "ad-badge--blue",  label: "Marketplace"},
  // User / misc
  active:     { cls: "ad-badge--green",  label: "Active"     },
  inactive:   { cls: "ad-badge--red",    label: "Inactive"   },
  true:       { cls: "ad-badge--green",  label: "Active"     },
  false:      { cls: "ad-badge--red",    label: "Inactive"   },
  // Channels
  marketplace:  { cls: "ad-badge--blue",  label: "Marketplace"  },
  thrift_store: { cls: "ad-badge--teal",  label: "Thrift Store" },
  // Import
  success:    { cls: "ad-badge--green",  label: "Success"    },
  failed:     { cls: "ad-badge--red",    label: "Failed"     },
  partial:    { cls: "ad-badge--amber",  label: "Partial"    },
};

export default function AdminBadge({ value, label: overrideLabel }) {
  const key = String(value ?? "").toLowerCase();
  const config = STATUS_MAP[key] || { cls: "ad-badge--gray", label: value || "—" };
  return (
    <span className={`ad-badge ${config.cls}`}>
      {overrideLabel || config.label}
    </span>
  );
}