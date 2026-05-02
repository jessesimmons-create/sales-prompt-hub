const STAGES = [
  {
    id: 'prep-strat',
    name: 'Prep Strat',
    icon: '🎯',
    color: '#6366f1',
    steps: [
      { id: 'stp-ps-1', title: 'Research company background and recent news' },
      { id: 'stp-ps-2', title: 'Identify key stakeholders and org chart' },
      { id: 'stp-ps-3', title: 'Review competitive landscape' },
      { id: 'stp-ps-4', title: 'Define success criteria and ICP fit' },
    ],
    conditions: [
      {
        id: 'ps-new-logo',
        name: 'New Logo',
        description: 'Prospecting into a net-new account with no prior relationship.',
        prompts: [
          { id: 'ps-nl-1', title: 'ICP Fit Analysis', body: '' },
          { id: 'ps-nl-2', title: 'Stakeholder Mapping', body: '' },
          { id: 'ps-nl-3', title: 'Competitive Landscape Research', body: '' },
        ],
      },
      {
        id: 'ps-expansion',
        name: 'Expansion / Upsell',
        description: 'Preparing to grow an existing customer relationship.',
        prompts: [
          { id: 'ps-ex-1', title: 'Usage & Health Analysis', body: '' },
          { id: 'ps-ex-2', title: 'Expansion Value Case', body: '' },
          { id: 'ps-ex-3', title: 'Multi-threading Strategy', body: '' },
        ],
      },
    ],
  },
  {
    id: 'discovery',
    name: 'Discovery',
    icon: '🔍',
    color: '#0ea5e9',
    steps: [
      { id: 'stp-d-1', title: 'Send pre-call agenda to prospect' },
      { id: 'stp-d-2', title: 'Confirm attendees and roles' },
      { id: 'stp-d-3', title: 'Prepare discovery question set' },
      { id: 'stp-d-4', title: 'Send follow-up summary within 24 hrs' },
    ],
    conditions: [
      {
        id: 'disc-active',
        name: 'Active & Engaged',
        description: 'Prospect is responsive and meetings are progressing well.',
        prompts: [
          { id: 'd-a-1', title: 'Discovery Question Set', body: '' },
          { id: 'd-a-2', title: 'Champion Identification', body: '' },
          { id: 'd-a-3', title: 'Success Criteria Definition', body: '' },
        ],
      },
      {
        id: 'disc-dark',
        name: 'Gone Dark',
        description: 'Prospect has stopped responding after initial interest.',
        prompts: [
          { id: 'd-d-1', title: 'Re-engagement Outreach', body: '' },
          { id: 'd-d-2', title: 'Breakup Email', body: '' },
        ],
      },
    ],
  },
  {
    id: 'demo',
    name: 'Demo',
    icon: '🖥️',
    color: '#8b5cf6',
    steps: [
      { id: 'stp-dm-1', title: 'Customize demo environment to prospect use case' },
      { id: 'stp-dm-2', title: 'Confirm attendees and send agenda' },
      { id: 'stp-dm-3', title: 'Prep answers to likely technical questions' },
      { id: 'stp-dm-4', title: 'Send post-demo recap and next steps' },
    ],
    conditions: [
      {
        id: 'demo-active',
        name: 'Active & Engaged',
        description: 'Demo is scheduled and the prospect is participating actively.',
        prompts: [
          { id: 'dm-a-1', title: 'Pre-Demo Customization', body: '' },
          { id: 'dm-a-2', title: 'Demo Follow-up Recap', body: '' },
          { id: 'dm-a-3', title: 'Next Steps Alignment', body: '' },
        ],
      },
      {
        id: 'demo-dark',
        name: 'Gone Dark After Demo',
        description: 'Prospect attended the demo but has since gone silent.',
        prompts: [
          { id: 'dm-d-1', title: 'Post-Demo Re-engagement', body: '' },
          { id: 'dm-d-2', title: 'Obstacle Surfacing', body: '' },
        ],
      },
      {
        id: 'demo-multi',
        name: 'Multi-Stakeholder',
        description: 'Multiple decision-makers or technical evaluators will be present.',
        prompts: [
          { id: 'dm-m-1', title: 'Stakeholder Alignment Prep', body: '' },
          { id: 'dm-m-2', title: 'Objection Handling Matrix', body: '' },
          { id: 'dm-m-3', title: 'Technical Deep-Dive Prompt', body: '' },
        ],
      },
    ],
  },
  {
    id: 'decision',
    name: 'Decision',
    icon: '⚖️',
    color: '#f59e0b',
    steps: [
      { id: 'stp-dec-1', title: 'Confirm decision criteria and weighting' },
      { id: 'stp-dec-2', title: 'Deliver tailored business case' },
      { id: 'stp-dec-3', title: 'Schedule executive alignment call' },
      { id: 'stp-dec-4', title: 'Confirm decision timeline and next step' },
    ],
    conditions: [
      {
        id: 'dec-active',
        name: 'Active Evaluation',
        description: 'Prospect is in final evaluation, actively comparing vendors.',
        prompts: [
          { id: 'dec-a-1', title: 'Competitive Differentiation', body: '' },
          { id: 'dec-a-2', title: 'Decision Criteria Alignment', body: '' },
          { id: 'dec-a-3', title: 'Executive Sponsor Outreach', body: '' },
        ],
      },
      {
        id: 'dec-dark',
        name: 'Gone Dark',
        description: 'Evaluation has stalled and the prospect is not responding.',
        prompts: [
          { id: 'dec-d-1', title: 'Decision Stall Re-engagement', body: '' },
          { id: 'dec-d-2', title: 'Risk of Inaction Frame', body: '' },
        ],
      },
      {
        id: 'dec-committee',
        name: 'Committee Decision',
        description: 'Multiple stakeholders must align internally before a decision.',
        prompts: [
          { id: 'dec-c-1', title: 'Champion Consensus-Building', body: '' },
          { id: 'dec-c-2', title: 'Executive Business Case', body: '' },
        ],
      },
    ],
  },
  {
    id: 'verbal-yes',
    name: 'Verbal Yes',
    icon: '🤝',
    color: '#10b981',
    steps: [
      { id: 'stp-vy-1', title: 'Send verbal confirmation email to champion' },
      { id: 'stp-vy-2', title: 'Build and share mutual close plan' },
      { id: 'stp-vy-3', title: 'Confirm internal approvals needed' },
    ],
    conditions: [
      {
        id: 'vy-active',
        name: 'Moving Forward',
        description: 'Verbal commitment received and deal is progressing to contract.',
        prompts: [
          { id: 'vy-a-1', title: 'Mutual Close Plan', body: '' },
          { id: 'vy-a-2', title: 'Champion Enablement', body: '' },
          { id: 'vy-a-3', title: 'Deal Summary Email', body: '' },
        ],
      },
      {
        id: 'vy-stalled',
        name: 'Stalled After Verbal',
        description: 'Verbal yes received but momentum has since slowed or stopped.',
        prompts: [
          { id: 'vy-s-1', title: 'Urgency Re-creation', body: '' },
          { id: 'vy-s-2', title: 'Internal Obstacle Discovery', body: '' },
        ],
      },
    ],
  },
  {
    id: 'procurement',
    name: 'Procurement / Legal',
    icon: '📋',
    color: '#06b6d4',
    steps: [
      { id: 'stp-pr-1', title: 'Send order form / MSA to procurement' },
      { id: 'stp-pr-2', title: 'Confirm legal reviewer and point of contact' },
      { id: 'stp-pr-3', title: 'Schedule redline review call' },
      { id: 'stp-pr-4', title: 'Confirm signature authority and process' },
    ],
    conditions: [
      {
        id: 'proc-standard',
        name: 'Standard Process',
        description: 'Normal procurement review with straightforward terms.',
        prompts: [
          { id: 'pr-s-1', title: 'Procurement Primer for Champion', body: '' },
          { id: 'pr-s-2', title: 'Legal Review Preparation', body: '' },
        ],
      },
      {
        id: 'proc-complex',
        name: 'Complex / Long Cycle',
        description: 'Extended legal or procurement process with multiple reviews.',
        prompts: [
          { id: 'pr-c-1', title: 'Executive Escalation', body: '' },
          { id: 'pr-c-2', title: 'Deal Acceleration Strategy', body: '' },
          { id: 'pr-c-3', title: 'Redline Response Prep', body: '' },
        ],
      },
      {
        id: 'proc-dark',
        name: 'Gone Dark in Procurement',
        description: 'Procurement review has stalled with no updates.',
        prompts: [
          { id: 'pr-d-1', title: 'Procurement Status Check-in', body: '' },
          { id: 'pr-d-2', title: 'Champion Activation', body: '' },
        ],
      },
    ],
  },
  {
    id: 'no-show',
    name: 'No Show',
    icon: '📵',
    color: '#ef4444',
    steps: [
      { id: 'stp-ns-1', title: 'Send reschedule message within 15 minutes' },
      { id: 'stp-ns-2', title: 'Follow up again at 24 hours' },
      { id: 'stp-ns-3', title: 'Re-qualify deal status in CRM' },
    ],
    conditions: [
      {
        id: 'ns-first',
        name: 'First No Show',
        description: 'Prospect missed the first scheduled meeting.',
        prompts: [
          { id: 'ns-f-1', title: 'Quick Reschedule Outreach', body: '' },
          { id: 'ns-f-2', title: 'Alternative Format Offer', body: '' },
        ],
      },
      {
        id: 'ns-repeat',
        name: 'Repeated No Shows',
        description: 'Prospect has missed multiple scheduled meetings.',
        prompts: [
          { id: 'ns-r-1', title: 'Pattern Break Outreach', body: '' },
          { id: 'ns-r-2', title: 'Re-qualification / Breakup', body: '' },
        ],
      },
    ],
  },
  {
    id: 'closed',
    name: 'Closed',
    icon: '🏁',
    color: '#64748b',
    steps: [
      { id: 'stp-cl-1', title: 'Update CRM and close opportunity' },
      { id: 'stp-cl-2', title: 'Brief CS team and schedule kickoff' },
      { id: 'stp-cl-3', title: 'Send internal win / loss notification' },
      { id: 'stp-cl-4', title: 'Document key learnings in deal notes' },
    ],
    conditions: [
      {
        id: 'closed-won',
        name: 'Closed Won',
        description: 'Deal has been successfully closed.',
        prompts: [
          { id: 'cw-1', title: 'CS Handoff Brief', body: '' },
          { id: 'cw-2', title: 'Win Story Documentation', body: '' },
          { id: 'cw-3', title: 'Early Expansion Seed', body: '' },
        ],
      },
      {
        id: 'closed-lost',
        name: 'Closed Lost',
        description: 'Deal was lost to a competitor or ended in no decision.',
        prompts: [
          { id: 'cl-1', title: 'Loss Analysis Prompt', body: '' },
          { id: 'cl-2', title: 'Future Re-engagement Plan', body: '' },
        ],
      },
    ],
  },
];
