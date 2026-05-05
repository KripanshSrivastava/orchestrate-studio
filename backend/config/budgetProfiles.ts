export const budgetProfiles = {
  basic: {
    instances: ['t3.micro', 't3.small'],
    disk: [8, 16],
    ports: [22, 3000],
    regions: ['ap-south-1', 'us-east-1']
  },
  standard: {
    instances: ['t3.small', 't3.medium'],
    disk: [16, 32],
    ports: [22, 80, 443],
    regions: ['ap-south-1', 'us-east-1', 'eu-west-1']
  },
  pro: {
    instances: ['t3.medium', 't3.large'],
    disk: [32, 64],
    ports: [22, 80, 443],
    regions: ['all']
  }
};

export const priceHints: Record<string, string> = {
  't3.micro': '~$5-10/mo',
  't3.small': '~$10-20/mo',
  't3.medium': '~$20-40/mo',
  't3.large': '~$40-80/mo'
};
