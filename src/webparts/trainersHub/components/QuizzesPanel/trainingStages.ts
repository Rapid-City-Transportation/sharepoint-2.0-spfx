export interface ITrainingItem {
  key: string;
  label: string;
  url: string;
}

export interface ITrainingStage {
  number: number;
  title: string;
  videos: ITrainingItem[];
  quizzes: ITrainingItem[];
}

export const TRAINING_STAGES: ITrainingStage[] = [
  {
    number: 1,
    title: 'Intro / WSIB',
    videos: [
      {
        key: 's1-v-same-day-cancel',
        label: 'Inbound call: same-day cancel',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FStage%201%20%2D%20WSIB%20%2D%20Same%2Dday%20Cancel%2Emp4&ga=1&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E9bb8d17d%2D1da1%2D4095%2Da4dc%2D48382d3c0a89',
      },
    ],
    quizzes: [
      {
        key: 's1-q-wsib',
        label: 'WSIB',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUMTFSSEVEM0s4VktUU0ZWWVhVTVA0Q0pPQSQlQCN0PWcu',
      },
      {
        key: 's1-q-notes',
        label: 'Notes',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUMEgyQUhNVEdTMEtQSUoxSlNONVI0WkRTUiQlQCN0PWcu',
      },
      {
        key: 's1-q-auto-alerts-wsib',
        label: 'AUTO Alerts (WSIB)',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUMFJTWjczMFpZVjVQN1ExMEI1VlYwWTNFMSQlQCN0PWcu',
      },
      {
        key: 's1-q-manage-changes-wsib',
        label: 'Manage Changes (WSIB)',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUMk5QSFRUNTJSNks2NVZBU01IMElLQk9HNCQlQCN0PWcu',
      },
    ],
  },
  {
    number: 2,
    title: 'Return Queue',
    videos: [
      {
        key: 's2-v-eta-example',
        label: 'ETA Example (Our Driver)',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FStage%202%20%2D%20ETA%20%2D%20Example%201%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E7a130a68%2D8398%2D4277%2D916c%2D0c3d34867d1e',
      },
      {
        key: 's2-v-return-example-1',
        label: 'Return Example 1 (11:01 PM)',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FStage%202%20%2D%20Returns%20%2D%20Example%201%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E1562f79f%2Db621%2D41d9%2Db015%2Df64c2e927ef2',
      },
      {
        key: 's2-v-return-example-2',
        label: 'Return Example 2 (Driver Assigned)',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FStage%202%20%2D%20Returns%20%2D%20Example%202%2Emp4&ga=1&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E7603859e%2Daec7%2D4c22%2D82a0%2D2171b8e409a4',
      },
      {
        key: 's2-v-trip-monitor-return-queue',
        label: 'Trip Monitor — Return Queue',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FStage%202%20%2D%20Trip%20Monitor%20%2D%20Return%20Queue%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E91020db8%2Dd271%2D4ec6%2D902f%2D0f9da0e430cf',
      },
    ],
    quizzes: [
      {
        key: 's2-q-return-calls',
        label: 'Return Calls',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUMkhTREU1M1RPNEYzNFFPMEU1RjlQQkxPTCQlQCN0PWcu',
      },
      {
        key: 's2-q-eta-calls',
        label: 'ETA Calls',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxURUxKRUlQT080RjFXVVBaSFZOT0s5VFdPTyQlQCN0PWcu',
      },
    ],
  },
  {
    number: 3,
    title: 'Clinic Bookings',
    videos: [
      {
        key: 's3-v-intact-switch',
        label: 'Intact Switch',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FStage%203%20%2D%20Clinic%20Bookings%20%2D%20Intact%20Switch%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2Eb6e7f2b8%2D0629%2D4989%2D8df6%2D49e66a8b707c',
      },
    ],
    quizzes: [
      {
        key: 's3-q-who-is-customer',
        label: 'Who is the Customer?',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUN0w2QkRZSERESDRJUUhaTkJDWEZJTzVGTiQlQCN0PWcu',
      },
      {
        key: 's3-q-return-times',
        label: 'Return Times',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUNldJTjZBSFc3VDNHTFQ4VUxETDRXT1hFNiQlQCN0PWcu',
      },
      {
        key: 's3-q-problem-addresses',
        label: 'Problem Addresses',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUOVBSNU81N0JFUkU3TjFLNDJBMjkwUTVKRyQlQCN0PWcu',
      },
    ],
  },
  {
    number: 4,
    title: 'Confirmations',
    videos: [],
    quizzes: [
      {
        key: 's4-q-confirmations',
        label: 'Confirmations',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUQTczTFlERE1XU0dCRkZBUjBMVFMwRU8xOCQlQCN0PWcu',
      },
    ],
  },
  {
    number: 5,
    title: 'Cancels & Changes',
    videos: [
      {
        key: 's5-v-cancelling-booked-trip',
        label: 'Cancelling a Booked Trip',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FStage%205%20%2D%20Cancellation%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E62da655e%2D8368%2D4179%2Dad40%2Defa667fae784',
      },
      {
        key: 's5-v-expeflow-cancellation',
        label: 'Expeflow Cancellation',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FStage%205%20%2D%20Expeflow%20Cancellation%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2Eb4e8de48%2D62b9%2D4a6a%2D899c%2D4f3909703b20',
      },
    ],
    quizzes: [
      {
        key: 's5-q-cancels-changes',
        label: 'Cancels & Changes',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUM0dNUTg2UTc1MUNCNTRDRTVLMzlUUDZDUyQlQCN0PWcu',
      },
    ],
  },
  {
    number: 6,
    title: 'Approvals & Refreshers',
    videos: [
      {
        key: 's6-v-refresh-approvals',
        label: 'Refresh: Approvals',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FRefresh%20Training%2FRefresh%20Training%202%20%2D%20Approvals%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E8fe4de87%2D9ed5%2D4732%2Dba4e%2Db64adc6e1dde',
      },
      {
        key: 's6-v-refresh-referrals-service-codes',
        label: 'Refresh: Referrals & Service Codes',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FRefresh%20Training%2FRefresh%20Training%203%20%2D%20Referrals%20and%20Appt%20Types%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2Ea34a5fb3%2Db248%2D4080%2Da323%2Dfa59990f9f87',
      },
    ],
    quizzes: [
      {
        key: 's6-q-files-with-approval',
        label: 'Files with Approval',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyKz85tpnjwg9PsmL0mLznWPZUNkpJQk1RUkk4VTcyOU9FT0IwVDVYNDc1OS4u',
      },
      {
        key: 's6-q-cancels-changes-files-with-approval',
        label: 'Cancels & Changes (Files with Approval)',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUOU1KWjJMSUQ4WlBVNU1CUlBFNk45SklDRiQlQCN0PWcu',
      },
    ],
  },
  {
    number: 7,
    title: 'Transfers & Alerts',
    videos: [
      {
        key: 's7-v-driver-transfers',
        label: 'Driver Transfers',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FStage%207%20%2D%20Driver%20Transfers%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2Ea2cd36a8%2D2048%2D4579%2Db8d3%2De42c2fb0928d',
      },
    ],
    quizzes: [
      {
        key: 's7-q-auto-alerts',
        label: 'AUTO Alerts',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUOVZHWkhJUFNDWjZSVDlZSVhUNldSVVpBMSQlQCN0PWcu',
      },
      {
        key: 's7-q-dispatch-alerts',
        label: 'Dispatch Alerts',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUQVBPQ1E2TkdNTUxZS0RFUjhUTUJKMVRTMCQlQCN0PWcu',
      },
    ],
  },
  {
    number: 8,
    title: 'Inbound Calls',
    videos: [
      {
        key: 's8-v-refresh-verbal-bookings',
        label: 'Refresh: Verbal Bookings',
        url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/stream.aspx?id=%2FCustomer%20Service%2FTraining%2FTraining%20Videos%2FRefresh%20Training%2FRefresh%20Training%201%20%2D%20Verbal%20Bookings%2Emp4&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2Ee31f80f2%2D34bf%2D4df4%2Dafc6%2Ddaa7d51e76f2',
      },
    ],
    quizzes: [],
  },
  {
    number: 9,
    title: 'Community Care Clients',
    videos: [],
    quizzes: [
      {
        key: 's9-q-ctc',
        label: 'CTC',
        url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUMzJUUU1TRDkwV08wQVBHTUNQUlNLVFI3TCQlQCN0PWcu',
      },
    ],
  },
];
