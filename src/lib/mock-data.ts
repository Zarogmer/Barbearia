// Mock data para o protótipo (D1). Substituído por Prisma em PBI-01 (D2).
// Não use em código de produção.

export type MockOrg = {
  id: string;
  slug: string;
  name: string;
  address: string;
  rating: number;
  reviewsCount: number;
};

export type MockService = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
};

export type MockProfessional = {
  id: string;
  organizationId: string;
  name: string;
  bio: string;
  serviceIds: string[];
  active: boolean;
};

export type MockAppointment = {
  id: string;
  organizationId: string;
  professionalId: string;
  serviceId: string;
  customerName: string;
  startsAt: Date;
  endsAt: Date;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
};

export const ORGS: MockOrg[] = [
  {
    id: "org-1",
    slug: "barbearia-demo",
    name: "Barbearia Demo",
    address: "Av. Paulista, 1000 — São Paulo, SP",
    rating: 4.8,
    reviewsCount: 123,
  },
];

export const SERVICES: MockService[] = [
  {
    id: "svc-1",
    organizationId: "org-1",
    name: "Corte",
    description: "Corte de cabelo masculino tradicional ou moderno.",
    durationMinutes: 30,
    priceCents: 5000,
    active: true,
  },
  {
    id: "svc-2",
    organizationId: "org-1",
    name: "Barba",
    description: "Acabamento de barba com navalha e toalha quente.",
    durationMinutes: 20,
    priceCents: 3000,
    active: true,
  },
  {
    id: "svc-3",
    organizationId: "org-1",
    name: "Combo Corte + Barba",
    description: "Corte e barba completos com desconto.",
    durationMinutes: 50,
    priceCents: 7000,
    active: true,
  },
  {
    id: "svc-4",
    organizationId: "org-1",
    name: "Coloração",
    description: "Coloração e camuflagem de fios grisalhos.",
    durationMinutes: 90,
    priceCents: 15000,
    active: true,
  },
];

export const PROFESSIONALS: MockProfessional[] = [
  {
    id: "prof-1",
    organizationId: "org-1",
    name: "João Silva",
    bio: "10 anos de experiência. Especialista em degradê.",
    serviceIds: ["svc-1", "svc-2", "svc-3"],
    active: true,
  },
  {
    id: "prof-2",
    organizationId: "org-1",
    name: "Maria Santos",
    bio: "Especialista em coloração e cortes femininos.",
    serviceIds: ["svc-1", "svc-2", "svc-3", "svc-4"],
    active: true,
  },
];

// Slots fixos pro protótipo (vai virar dinâmico em PBI-06)
export const SAMPLE_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

// Slots indisponíveis (ocupados) — pro mock visual
export const OCCUPIED_SLOTS = ["11:00", "12:00", "13:00", "13:30"];

export function getOrgBySlug(slug: string): MockOrg | undefined {
  return ORGS.find((o) => o.slug === slug);
}

export function getServicesByOrg(orgId: string): MockService[] {
  return SERVICES.filter((s) => s.organizationId === orgId && s.active);
}

export function getProfessionalsByOrg(orgId: string): MockProfessional[] {
  return PROFESSIONALS.filter((p) => p.organizationId === orgId && p.active);
}

export function getProfessionalsForService(orgId: string, serviceId: string): MockProfessional[] {
  return getProfessionalsByOrg(orgId).filter((p) => p.serviceIds.includes(serviceId));
}

export function getServiceById(id: string): MockService | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function getProfessionalById(id: string): MockProfessional | undefined {
  return PROFESSIONALS.find((p) => p.id === id);
}

// Mock de agendamentos do dia (para admin)
const today = new Date();
today.setHours(0, 0, 0, 0);

function todayAt(hour: number, minute = 0): Date {
  const d = new Date(today);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const APPOINTMENTS: MockAppointment[] = [
  {
    id: "apt-1",
    organizationId: "org-1",
    professionalId: "prof-1",
    serviceId: "svc-1",
    customerName: "Bruno Silva",
    startsAt: todayAt(9, 0),
    endsAt: todayAt(9, 30),
    status: "CONFIRMED",
  },
  {
    id: "apt-2",
    organizationId: "org-1",
    professionalId: "prof-2",
    serviceId: "svc-2",
    customerName: "Ana Costa",
    startsAt: todayAt(9, 30),
    endsAt: todayAt(9, 50),
    status: "CONFIRMED",
  },
  {
    id: "apt-3",
    organizationId: "org-1",
    professionalId: "prof-1",
    serviceId: "svc-3",
    customerName: "Pedro Lima",
    startsAt: todayAt(10, 30),
    endsAt: todayAt(11, 20),
    status: "CONFIRMED",
  },
  {
    id: "apt-4",
    organizationId: "org-1",
    professionalId: "prof-2",
    serviceId: "svc-4",
    customerName: "Clara Souza",
    startsAt: todayAt(14, 0),
    endsAt: todayAt(15, 30),
    status: "CONFIRMED",
  },
  {
    id: "apt-5",
    organizationId: "org-1",
    professionalId: "prof-1",
    serviceId: "svc-1",
    customerName: "Rafael Mendes",
    startsAt: todayAt(15, 0),
    endsAt: todayAt(15, 30),
    status: "CONFIRMED",
  },
];

export function getAppointmentsByOrg(orgId: string): MockAppointment[] {
  return APPOINTMENTS.filter((a) => a.organizationId === orgId);
}

export function getAppointmentById(id: string): MockAppointment | undefined {
  return APPOINTMENTS.find((a) => a.id === id);
}
