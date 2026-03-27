'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { supabase, Service } from '@/lib/supabase';
import { getImageUrl } from '@/lib/getImageUrl';
import {
  buildServiceCatalog,
  findServiceNodeBySlug,
  getPublicDirectServices,
  getPublicServiceGroups,
  getPublicSubgroups,
  ServiceGroup,
  ServiceGroupNode,
  ServiceSubgroup,
  CatalogService,
} from '@/lib/serviceCatalog';
import { getSafeServiceDuration } from '@/lib/serviceDuration';

interface ServiceSelectProps {
  onServiceSelect: (service: Service) => void;
  preselectedServiceSlug?: string | null;
  onProgressMetaChange?: (meta: { current: number; total: number }) => void;
}

function ServiceImage({ title, imageUrl }: { title: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return <Image src={getImageUrl(imageUrl)} alt={title} fill className="object-cover" />;
  }

  return (
    <div className="flex h-full items-center justify-center bg-primary/8 text-4xl font-bold text-primary">
      {title.charAt(0)}
    </div>
  );
}

export default function ServiceSelect({ onServiceSelect, preselectedServiceSlug, onProgressMetaChange }: ServiceSelectProps) {
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [subgroups, setSubgroups] = useState<ServiceSubgroup[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const preselectionHandledRef = useRef<string | null>(null);

  const catalog = useMemo(() => buildServiceCatalog(groups, subgroups, services), [groups, subgroups, services]);
  const publicGroups = useMemo(() => getPublicServiceGroups(catalog), [catalog]);
  const selectedGroup = useMemo(
    () => publicGroups.find((group) => group.group.id === selectedGroupId) ?? null,
    [publicGroups, selectedGroupId]
  );
  const isGroupStepHidden = publicGroups.length === 1;
  const effectiveGroup = selectedGroup ?? (isGroupStepHidden ? publicGroups[0] ?? null : null);
  const visibleSubgroups = useMemo(() => (effectiveGroup ? getPublicSubgroups(effectiveGroup) : []), [effectiveGroup]);
  const shouldSkipSubgroupStep = Boolean(
    effectiveGroup &&
      effectiveGroup.mode === 'subgroups' &&
      visibleSubgroups.length === 1 &&
      (isGroupStepHidden || effectiveGroup.group.skip_subgroup_step_when_single_visible_child)
  );
  const selectedSubgroup = useMemo(
    () => (effectiveGroup ? visibleSubgroups.find((subgroup) => subgroup.subgroup.id === selectedSubgroupId) ?? null : null),
    [effectiveGroup, selectedSubgroupId, visibleSubgroups]
  );
  const serviceOptions = useMemo(() => {
    if (!effectiveGroup) return [];
    if (effectiveGroup.mode === 'services') {
      return getPublicDirectServices(effectiveGroup);
    }
    if (shouldSkipSubgroupStep) {
      return visibleSubgroups[0]?.services.filter((service) => service.effectiveVisible) ?? [];
    }
    if (selectedSubgroup) {
      return selectedSubgroup.services.filter((service) => service.effectiveVisible);
    }
    return [];
  }, [effectiveGroup, selectedSubgroup, shouldSkipSubgroupStep, visibleSubgroups]);

  useEffect(() => {
    async function fetchCatalog() {
      try {
        const [{ data: groupRows, error: groupError }, { data: subgroupRows, error: subgroupError }, { data: serviceRows, error: serviceError }] = await Promise.all([
          supabase.from('service_groups').select('*').order('sort_order').order('id'),
          supabase.from('service_subgroups').select('*').order('sort_order').order('id'),
          supabase.from('servicios').select('*').order('sort_order').order('id'),
        ]);

        if (groupError) throw groupError;
        if (subgroupError) throw subgroupError;
        if (serviceError) throw serviceError;

        setGroups((groupRows ?? []) as ServiceGroup[]);
        setSubgroups((subgroupRows ?? []) as ServiceSubgroup[]);
        setServices((serviceRows ?? []) as CatalogService[]);
        setError(null);
      } catch (err) {
        console.error('Error chargement catalogue hiérarchique:', err);
        setError(err instanceof Error ? err.message : 'Impossible de charger les services');
      } finally {
        setLoading(false);
      }
    }

    void fetchCatalog();
  }, []);

  useEffect(() => {
    if (!onProgressMetaChange) return;

    if (!effectiveGroup) {
      onProgressMetaChange({ current: 1, total: 3 });
      return;
    }

    if (effectiveGroup.mode === 'services') {
      onProgressMetaChange(isGroupStepHidden ? { current: 1, total: 1 } : { current: 2, total: 2 });
      return;
    }

    if (!shouldSkipSubgroupStep && !selectedSubgroup) {
      onProgressMetaChange(isGroupStepHidden ? { current: 1, total: 2 } : { current: 2, total: 3 });
      return;
    }

    if (shouldSkipSubgroupStep) {
      onProgressMetaChange(isGroupStepHidden ? { current: 1, total: 1 } : { current: 2, total: 2 });
      return;
    }

    onProgressMetaChange(isGroupStepHidden ? { current: 2, total: 2 } : { current: 3, total: 3 });
  }, [effectiveGroup, isGroupStepHidden, onProgressMetaChange, selectedSubgroup, shouldSkipSubgroupStep]);

  useEffect(() => {
    if (!preselectedServiceSlug || loading || publicGroups.length === 0) return;
    if (preselectionHandledRef.current === preselectedServiceSlug) return;

    preselectionHandledRef.current = preselectedServiceSlug;

    const match = findServiceNodeBySlug(publicGroups, preselectedServiceSlug);
    if (!match || !match.service.effectiveVisible) {
      setNotice('Ce service n\'est plus disponible. Veuillez choisir un autre service.');
      return;
    }

    setSelectedGroupId(match.group.group.id);
    setSelectedSubgroupId(match.subgroup?.subgroup.id ?? null);
    onServiceSelect(match.service.service);
  }, [loading, onServiceSelect, preselectedServiceSlug, publicGroups]);

  function handleSelectGroup(groupNode: ServiceGroupNode) {
    setSelectedGroupId(groupNode.group.id);
    setSelectedSubgroupId(null);
    setNotice(null);
  }

  function handleSelectSubgroup(subgroupId: number) {
    setSelectedSubgroupId(subgroupId);
    setNotice(null);
  }

  function handleBack() {
    if (!effectiveGroup) return;

    if (effectiveGroup.mode === 'services' || shouldSkipSubgroupStep) {
      if (isGroupStepHidden) return;
      setSelectedGroupId(null);
      setSelectedSubgroupId(null);
      return;
    }

    if (selectedSubgroup) {
      setSelectedSubgroupId(null);
      return;
    }

    if (isGroupStepHidden) return;
    setSelectedGroupId(null);
  }

  const showGroupStep = !effectiveGroup;
  const showSubgroupStep = Boolean(effectiveGroup && effectiveGroup.mode === 'subgroups' && !shouldSkipSubgroupStep && !selectedSubgroup);
  const showServiceStep = Boolean(effectiveGroup && (effectiveGroup.mode === 'services' || shouldSkipSubgroupStep || selectedSubgroup));
  const showBackButton = Boolean(effectiveGroup) && (!isGroupStepHidden || Boolean(selectedSubgroup));

  const backButtonLabel = useMemo(() => {
    if (!effectiveGroup) return 'Retour';
    if (selectedSubgroup && !shouldSkipSubgroupStep) {
      return isGroupStepHidden ? 'Retour aux options' : 'Retour à la sélection du groupe';
    }
    if (!isGroupStepHidden) {
      return 'Retour à la sélection des services';
    }
    return 'Retour';
  }, [effectiveGroup, isGroupStepHidden, selectedSubgroup, shouldSkipSubgroupStep]);


  const introText = !effectiveGroup
    ? 'Découvrez les services disponibles.'
    : effectiveGroup.mode === 'services' || shouldSkipSubgroupStep
      ? 'Choisissez le service qui vous convient.'
      : isGroupStepHidden
        ? 'Choisissez une option pour voir les services disponibles.'
        : 'Choisissez le sous-groupe, puis le service qui vous convient.';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto mb-8 max-w-4xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-primary md:text-4xl">Réserver un service</h2>
        <p className="text-lg text-text-medium">{introText}</p>
      </div>

      {(notice || error) && (
        <div className="mx-auto mb-6 max-w-5xl rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-secondary shadow-sm">
          {notice || error}
        </div>
      )}

      {!showGroupStep && showBackButton ? (
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-accent hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            {backButtonLabel}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        </div>
      ) : null}

      {!loading && showGroupStep ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {publicGroups.map((groupNode) => (
            <button
              key={groupNode.group.id}
              type="button"
              onClick={() => handleSelectGroup(groupNode)}
              className="group overflow-hidden rounded-3xl bg-white text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-56 w-full overflow-hidden bg-neutral-100">
                <ServiceImage title={groupNode.group.name} imageUrl={groupNode.group.image_url} />
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-2xl font-bold text-secondary">{groupNode.group.name}</h3>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {groupNode.visibleServiceCount} services
                  </span>
                </div>
                {groupNode.group.description ? (
                  <p className="text-sm leading-relaxed text-gray-600">{groupNode.group.description}</p>
                ) : null}
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Voir le groupe
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {!loading && showSubgroupStep ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleSubgroups.map((subgroupNode) => (
            <button
              key={subgroupNode.subgroup.id}
              type="button"
              onClick={() => handleSelectSubgroup(subgroupNode.subgroup.id)}
              className="group rounded-3xl border border-primary/10 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="text-2xl font-bold text-secondary">{subgroupNode.subgroup.name}</h3>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {subgroupNode.visibleServiceCount} services
                </span>
              </div>
              {isGroupStepHidden ? (
                <p className="mb-4 text-sm text-gray-500">Choisissez cette option pour afficher les services correspondants.</p>
              ) : subgroupNode.subgroup.description ? (
                <p className="mb-4 text-sm leading-relaxed text-gray-600">{subgroupNode.subgroup.description}</p>
              ) : (
                <p className="mb-4 text-sm text-gray-500">Choisissez ce sous-groupe pour afficher les services correspondants.</p>
              )}
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Voir les services
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {!loading && showServiceStep ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {serviceOptions.map((serviceNode) => (
            <button
              key={serviceNode.service.id}
              type="button"
              onClick={() => onServiceSelect(serviceNode.service)}
              className="overflow-hidden rounded-3xl bg-white text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-56 w-full overflow-hidden bg-neutral-100">
                <ServiceImage title={serviceNode.service.nombre} imageUrl={serviceNode.service.imagen_url} />
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-2xl font-bold text-secondary">{serviceNode.service.nombre}</h3>
                  <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold text-primary">
                    {serviceNode.service.precio} CHF
                  </span>
                </div>
                <p className="min-h-[72px] text-sm leading-relaxed text-gray-600">{serviceNode.service.descripcion}</p>
                <div className="flex items-center justify-between gap-4 text-sm text-gray-500">
                  <span>Durée: {getSafeServiceDuration(serviceNode.service.duration)} min</span>
                  <span className="font-semibold text-primary">Continuer</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
