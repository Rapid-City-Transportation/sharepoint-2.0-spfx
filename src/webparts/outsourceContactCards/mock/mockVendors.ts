import { IVendor } from '../models/types';

/**
 * Fake vendors for the USE_MOCK_DATA flag. Shaped like real Driver Directory
 * rows, including the messy cases: missing priority, missing zone, an email in
 * the phone column. No real companies or numbers.
 */
export const MOCK_VENDORS: IVendor[] = [
  {
    id: 'm1',
    name: 'MAPLETOWN TAXI (Georgetown) #900',
    vehicleTypes: ['Sedan'],
    portal: false,
    zones: [{ zone: 'Halton', cities: ['Acton', 'Georgetown'], priority: 'Primary Option' }],
    templates: [],
    dispatch: { phone: '905-555-9900', hours: '24/7' },
    managerOnly: {
      insuranceProvider: 'Intact Insurance Company',
      policyNumber: '501000001',
      coverageType: 'Commercial General Liability',
      policyExpiry: '2027-01-20T08:00:00Z',
      insuranceStatus: 'Valid',
      certificateOnFile: true,
      contractOnFile: true,
      rateNotes: 'Metered, account invoiced monthly.',
    },
  },
  {
    id: 'm2',
    name: 'NORTHLINE CAB (Bolton) #RC-T900',
    vehicleTypes: ['Sedan', 'Minivan'],
    portal: true,
    zones: [
      {
        zone: 'Peel',
        cities: ['Bolton', 'Caledon', 'Kleinburg'],
        priority: 'Primary Option',
        specialInstructions: 'Include #RC-T900 in the email subject line.',
      },
    ],
    templates: [],
    dispatch: {
      phone: 'book@example-cab.ca',
      secondaryPhone: '416-555-0000',
      email: 'book@example-cab.ca',
      bookingMethod: 'Email First',
    },
  },
  {
    id: 'm3',
    name: 'Bayshore Taxi (Owen Sound)',
    vehicleTypes: ['Sedan', 'Minivan', 'Wheelchair (SL)'],
    portal: false,
    zones: [
      { zone: 'Owen Sound', cities: ['The Blue Mountains', 'Chatsworth', 'Hepworth'], priority: 'Secondary Option' },
    ],
    templates: [],
    dispatch: { phone: '519-555-1231', afterHoursPhone: '519-555-1232', service247: true },
  },
  {
    id: 'm4',
    name: 'Lakeview Medical Transport Inc',
    vehicleTypes: ['Stretcher'],
    portal: false,
    zones: [
      { zone: 'North Simcoe', cities: ['Barrie', 'Midland'], priority: 'Primary Option' },
    ],
    templates: [],
    dispatch: { phone: '416-555-7678', bookingMethod: 'Phone First' },
  },
  {
    id: 'm5',
    name: 'Borealis Cab (Sault Ste Marie)',
    vehicleTypes: [],
    portal: false,
    zones: [{ zone: 'North Ontario', cities: ['Sault Ste Marie'] }],
    templates: [],
    dispatch: { phone: '705-555-1300', email: 'borealiscab@example.ca' },
  },
  {
    id: 'm6',
    name: 'Tri-City Wheels (Kitchener)',
    vehicleTypes: ['Sedan', 'Wheelchair (RL)'],
    portal: true,
    zones: [
      {
        zone: 'Tri Cities (Guelph, Kitchener, Cambridge)',
        cities: ['Kitchener', 'Guelph', 'Cambridge', 'Milverton'],
        priority: 'When Required',
      },
    ],
    templates: [],
    dispatch: { phone: '519-555-4477', hours: 'Monday to Friday, 6 AM to 10 PM' },
  },
];
