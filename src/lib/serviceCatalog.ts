import { Service } from '@/lib/supabase';

export type ServiceGroup = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_visible: boolean;
  skip_subgroup_step_when_single_visible_child: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ServiceSubgroup = {
  id: number;
  group_id: number;
  name: string;
  slug: string;
  description: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type CatalogService = Service & {
  slug: string;
  group_id: number;
  subgroup_id: number | null;
  sort_order: number;
  landing_featured: boolean;
  landing_sort_order: number | null;
  updated_at?: string;
};

export type ServiceLeafNode = {
  type: 'service';
  service: CatalogService;
  configuredVisible: boolean;
  effectiveVisible: boolean;
};

export type ServiceSubgroupNode = {
  type: 'subgroup';
  subgroup: ServiceSubgroup;
  configuredVisible: boolean;
  effectiveVisible: boolean;
  visibleServiceCount: number;
  totalServiceCount: number;
  services: ServiceLeafNode[];
};

export type ServiceGroupNode = {
  type: 'group';
  group: ServiceGroup;
  configuredVisible: boolean;
  effectiveVisible: boolean;
  mode: 'empty' | 'services' | 'subgroups';
  visibleServiceCount: number;
  totalServiceCount: number;
  visibleSubgroupCount: number;
  services: ServiceLeafNode[];
  subgroups: ServiceSubgroupNode[];
};

const bySort = (a: { sort_order?: number; id: number }, b: { sort_order?: number; id: number }) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id;

export function getServiceConfiguredVisible(service: Pick<CatalogService, 'active'>): boolean {
  return service.active !== false;
}

export function buildServiceCatalog(
  groups: ServiceGroup[],
  subgroups: ServiceSubgroup[],
  services: CatalogService[]
): ServiceGroupNode[] {
  const subgroupsByGroup = new Map<number, ServiceSubgroup[]>();
  const servicesByGroup = new Map<number, CatalogService[]>();
  const servicesBySubgroup = new Map<number, CatalogService[]>();

  for (const subgroup of subgroups) {
    const list = subgroupsByGroup.get(subgroup.group_id) ?? [];
    list.push(subgroup);
    subgroupsByGroup.set(subgroup.group_id, list);
  }

  for (const service of services) {
    if (service.subgroup_id) {
      const list = servicesBySubgroup.get(service.subgroup_id) ?? [];
      list.push(service);
      servicesBySubgroup.set(service.subgroup_id, list);
    } else {
      const list = servicesByGroup.get(service.group_id) ?? [];
      list.push(service);
      servicesByGroup.set(service.group_id, list);
    }
  }

  return [...groups]
    .sort(bySort)
    .map((group) => {
      const groupConfiguredVisible = group.is_visible;
      const directServices = [...(servicesByGroup.get(group.id) ?? [])].sort(bySort);
      const subgroupNodes = [...(subgroupsByGroup.get(group.id) ?? [])]
        .sort(bySort)
        .map<ServiceSubgroupNode>((subgroup) => {
          const subgroupConfiguredVisible = subgroup.is_visible;
          const serviceNodes = [...(servicesBySubgroup.get(subgroup.id) ?? [])]
            .sort(bySort)
            .map<ServiceLeafNode>((service) => {
              const configuredVisible = getServiceConfiguredVisible(service);
              const effectiveVisible = groupConfiguredVisible && subgroupConfiguredVisible && configuredVisible;

              return {
                type: 'service',
                service,
                configuredVisible,
                effectiveVisible,
              };
            });

          return {
            type: 'subgroup',
            subgroup,
            configuredVisible: subgroupConfiguredVisible,
            effectiveVisible: groupConfiguredVisible && subgroupConfiguredVisible,
            visibleServiceCount: serviceNodes.filter((service) => service.effectiveVisible).length,
            totalServiceCount: serviceNodes.length,
            services: serviceNodes,
          };
        });

      const directServiceNodes = directServices.map<ServiceLeafNode>((service) => {
        const configuredVisible = getServiceConfiguredVisible(service);
        const effectiveVisible = groupConfiguredVisible && configuredVisible;

        return {
          type: 'service',
          service,
          configuredVisible,
          effectiveVisible,
        };
      });

      const mode: ServiceGroupNode['mode'] = subgroupNodes.length > 0 ? 'subgroups' : directServiceNodes.length > 0 ? 'services' : 'empty';
      const visibleServiceCount =
        directServiceNodes.filter((service) => service.effectiveVisible).length +
        subgroupNodes.reduce((acc, subgroup) => acc + subgroup.visibleServiceCount, 0);
      const totalServiceCount =
        directServiceNodes.length + subgroupNodes.reduce((acc, subgroup) => acc + subgroup.totalServiceCount, 0);

      return {
        type: 'group',
        group,
        configuredVisible: groupConfiguredVisible,
        effectiveVisible: groupConfiguredVisible && visibleServiceCount > 0,
        mode,
        visibleServiceCount,
        totalServiceCount,
        visibleSubgroupCount: subgroupNodes.filter((subgroup) => subgroup.effectiveVisible && subgroup.visibleServiceCount > 0).length,
        services: directServiceNodes,
        subgroups: subgroupNodes,
      };
    });
}

export function getPublicServiceGroups(nodes: ServiceGroupNode[]): ServiceGroupNode[] {
  return nodes.filter((group) => group.effectiveVisible && group.visibleServiceCount > 0);
}

export function getPublicSubgroups(group: ServiceGroupNode): ServiceSubgroupNode[] {
  return group.subgroups.filter((subgroup) => subgroup.effectiveVisible && subgroup.visibleServiceCount > 0);
}

export function getPublicDirectServices(group: ServiceGroupNode): ServiceLeafNode[] {
  return group.services.filter((service) => service.effectiveVisible);
}

export function getPublicFeaturedServices(nodes: ServiceGroupNode[]): ServiceLeafNode[] {
  const featured: ServiceLeafNode[] = [];

  for (const group of nodes) {
    for (const service of group.services) {
      if (service.effectiveVisible && service.service.landing_featured) {
        featured.push(service);
      }
    }
    for (const subgroup of group.subgroups) {
      for (const service of subgroup.services) {
        if (service.effectiveVisible && service.service.landing_featured) {
          featured.push(service);
        }
      }
    }
  }

  return featured.sort((a, b) => {
    const orderA = a.service.landing_sort_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.service.landing_sort_order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB || bySort(a.service, b.service);
  });
}

export function findServiceNodeBySlug(nodes: ServiceGroupNode[], slug: string): { group: ServiceGroupNode; subgroup: ServiceSubgroupNode | null; service: ServiceLeafNode } | null {
  for (const group of nodes) {
    for (const service of group.services) {
      if (service.service.slug === slug) {
        return { group, subgroup: null, service };
      }
    }

    for (const subgroup of group.subgroups) {
      for (const service of subgroup.services) {
        if (service.service.slug === slug) {
          return { group, subgroup, service };
        }
      }
    }
  }

  return null;
}
