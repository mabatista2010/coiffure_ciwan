'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Plus, Search, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { supabase } from '@/lib/supabase';
import { useAdminAccess } from '@/components/admin/AdminAccessProvider';
import {
  buildServiceCatalog,
  getPublicFeaturedServices,
  ServiceGroup,
  ServiceGroupNode,
  ServiceLeafNode,
  ServiceSubgroup,
  ServiceSubgroupNode,
  CatalogService,
} from '@/lib/serviceCatalog';
import { getSafeServiceDuration, getServiceDurationValidationMessage } from '@/lib/serviceDuration';
import { getImageUrl } from '@/lib/getImageUrl';
import { hasPermission } from '@/lib/permissions/helpers';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminSidePanel, SectionHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ServiceManagementProps {
  onUpdate?: () => void;
}

type EditorKind = 'group' | 'subgroup' | 'service';

type GroupFormState = {
  id: number | null;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_visible: boolean;
  skip_subgroup_step_when_single_visible_child: boolean;
  sort_order: number;
  slug_manually_edited: boolean;
};

type SubgroupFormState = {
  id: number | null;
  group_id: number | null;
  name: string;
  slug: string;
  description: string;
  is_visible: boolean;
  sort_order: number;
  slug_manually_edited: boolean;
};

type ServiceFormState = {
  id: number | null;
  nombre: string;
  slug: string;
  descripcion: string;
  precio: number;
  duration: number;
  imagen_url: string;
  active: boolean;
  group_id: number | null;
  subgroup_id: number | null;
  sort_order: number;
  landing_featured: boolean;
  landing_sort_order: number | null;
  slug_manually_edited: boolean;
};

type EditorState =
  | { kind: 'group'; mode: 'create' | 'edit'; form: GroupFormState }
  | { kind: 'subgroup'; mode: 'create' | 'edit'; form: SubgroupFormState }
  | { kind: 'service'; mode: 'create' | 'edit'; form: ServiceFormState };

type ConfirmDialogState = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  confirmTone?: 'default' | 'danger';
  onConfirm: (() => void | Promise<void>) | null;
};

const createEmptyGroupForm = (): GroupFormState => ({
  id: null,
  name: '',
  slug: '',
  description: '',
  image_url: '',
  is_visible: true,
  skip_subgroup_step_when_single_visible_child: false,
  sort_order: 0,
  slug_manually_edited: false,
});

const createEmptySubgroupForm = (groupId: number | null = null): SubgroupFormState => ({
  id: null,
  group_id: groupId,
  name: '',
  slug: '',
  description: '',
  is_visible: true,
  sort_order: 0,
  slug_manually_edited: false,
});

const createEmptyServiceForm = (groupId: number | null = null, subgroupId: number | null = null): ServiceFormState => ({
  id: null,
  nombre: '',
  slug: '',
  descripcion: '',
  precio: 0,
  duration: 30,
  imagen_url: '',
  active: true,
  group_id: groupId,
  subgroup_id: subgroupId,
  sort_order: 0,
  landing_featured: false,
  landing_sort_order: null,
  slug_manually_edited: false,
});

function makeNodeKey(kind: EditorKind, id: number) {
  return `${kind}:${id}`;
}

function slugifyInput(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}


function FloatingNodeMenu({
  content,
  menuKey,
  openMenuKey,
  setOpenMenuKey,
}: {
  content: React.ReactNode;
  menuKey: string;
  openMenuKey: string | null;
  setOpenMenuKey: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'bottom' | 'top' } | null>(null);
  const isOpen = openMenuKey === menuKey;

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      const menuWidth = Math.max(220, menuRef.current?.offsetWidth ?? 220);
      const menuHeight = menuRef.current?.offsetHeight ?? 120;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const spacing = 8;

      const left = Math.max(12, Math.min(buttonRect.right - menuWidth, viewportWidth - menuWidth - 12));
      const fitsBelow = buttonRect.bottom + spacing + menuHeight <= viewportHeight - 12;
      const top = fitsBelow
        ? buttonRect.bottom + spacing
        : Math.max(12, buttonRect.top - menuHeight - spacing);

      setPosition({ top, left, placement: fitsBelow ? 'bottom' : 'top' });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, content]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpenMenuKey(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuKey(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setOpenMenuKey]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpenMenuKey(isOpen ? null : menuKey)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {isOpen
        ? createPortal(
            <div
              ref={menuRef}
              data-floating-menu={menuKey}
              className="fixed z-[240] min-w-[220px] rounded-xl border border-border bg-background p-2 shadow-2xl"
              style={{
                top: position?.top ?? -9999,
                left: position?.left ?? -9999,
                visibility: position ? 'visible' : 'hidden',
                maxWidth: 'calc(100vw - 24px)',
              }}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export default function ServiceManagement({ onUpdate }: ServiceManagementProps) {
  const { accessContext } = useAdminAccess();
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [subgroups, setSubgroups] = useState<ServiceSubgroup[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirmer',
    cancelLabel: 'Annuler',
    hideCancel: false,
    confirmTone: 'default',
    onConfirm: null,
  });

  const catalog = useMemo(() => buildServiceCatalog(groups, subgroups, services), [groups, subgroups, services]);
  const featuredLanding = useMemo(() => getPublicFeaturedServices(catalog), [catalog]);
  const canViewServices = hasPermission(accessContext, 'services.view');
  const canEditServicesContent = hasPermission(accessContext, 'services.content.edit');
  const canEditServicesBusiness = hasPermission(accessContext, 'services.business.edit');
  const canDeleteServices = hasPermission(accessContext, 'services.delete');
  const canCreateGroupsAndSubgroups = canEditServicesContent;
  const canCreateServices = canEditServicesContent && canEditServicesBusiness;
  const isReadOnly = !canEditServicesContent && !canEditServicesBusiness && !canDeleteServices;

  const editingGroupNode = useMemo(() => {
    if (editor?.kind !== 'group' || editor.mode !== 'edit' || !editor.form.id) return null;
    return catalog.find((groupNode) => groupNode.group.id === editor.form.id) ?? null;
  }, [catalog, editor]);

  const editingSubgroupNode = useMemo(() => {
    if (editor?.kind !== 'subgroup' || editor.mode !== 'edit' || !editor.form.id) return null;
    for (const groupNode of catalog) {
      const subgroupNode = groupNode.subgroups.find((node) => node.subgroup.id === editor.form.id);
      if (subgroupNode) {
        return { groupNode, subgroupNode };
      }
    }
    return null;
  }, [catalog, editor]);

  const editingServiceNode = useMemo(() => {
    if (editor?.kind !== 'service' || editor.mode !== 'edit' || !editor.form.id) return null;
    return catalog
      .flatMap((groupNode) => [
        ...groupNode.services,
        ...groupNode.subgroups.flatMap((subgroupNode) => subgroupNode.services),
      ])
      .find((node) => node.service.id === editor.form.id) ?? null;
  }, [catalog, editor]);

  const canSaveEditor = useMemo(() => {
    if (!editor) return false;
    if (editor.kind === 'group' || editor.kind === 'subgroup') {
      return canEditServicesContent;
    }
    if (editor.mode === 'create') {
      return canCreateServices;
    }
    return canEditServicesContent || canEditServicesBusiness;
  }, [canCreateServices, canEditServicesBusiness, canEditServicesContent, editor]);

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return catalog;

    return catalog.reduce<ServiceGroupNode[]>((acc, group) => {
      const groupMatch =
        group.group.name.toLowerCase().includes(query) ||
        (group.group.description ?? '').toLowerCase().includes(query);

      const directServices = groupMatch
        ? group.services
        : group.services.filter((service) => service.service.nombre.toLowerCase().includes(query));

      const filteredSubgroups = group.subgroups.reduce<ServiceSubgroupNode[]>((subgroupAcc, subgroup) => {
        const subgroupMatch =
          groupMatch ||
          subgroup.subgroup.name.toLowerCase().includes(query) ||
          (subgroup.subgroup.description ?? '').toLowerCase().includes(query);

        const subgroupServices = subgroupMatch
          ? subgroup.services
          : subgroup.services.filter((service) => service.service.nombre.toLowerCase().includes(query));

        if (!subgroupMatch && subgroupServices.length === 0) {
          return subgroupAcc;
        }

        subgroupAcc.push({
          ...subgroup,
          services: subgroupServices,
          visibleServiceCount: subgroupServices.filter((service) => service.effectiveVisible).length,
        });

        return subgroupAcc;
      }, []);

      if (!groupMatch && directServices.length === 0 && filteredSubgroups.length === 0) {
        return acc;
      }

      acc.push({
        ...group,
        services: directServices,
        subgroups: filteredSubgroups,
        visibleServiceCount:
          directServices.filter((service) => service.effectiveVisible).length +
          filteredSubgroups.reduce((sum, subgroup) => sum + subgroup.visibleServiceCount, 0),
      });

      return acc;
    }, []);
  }, [catalog, search]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
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
      setErrorMessage('');
      onUpdate?.();
    } catch (error) {
      console.error('Erreur chargement catalogue services:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors du chargement du catalogue services');
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  function toggleExpanded(key: string) {
    setExpanded((current) => ({ ...current, [key]: !current[key] }));
  }

  function closeEditor() {
    setEditor(null);
    setServiceImageFile(null);
    setGroupImageFile(null);
  }

  function requestConfirmation(options: {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    hideCancel?: boolean;
    confirmTone?: 'default' | 'danger';
    onConfirm: () => void | Promise<void>;
  }) {
    setConfirmDialog({
      open: true,
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? 'Confirmer',
      cancelLabel: options.cancelLabel ?? 'Annuler',
      hideCancel: options.hideCancel ?? false,
      confirmTone: options.confirmTone ?? 'default',
      onConfirm: options.onConfirm,
    });
  }

  function requestAlert(options: {
    title: string;
    description: string;
    confirmLabel?: string;
  }) {
    requestConfirmation({
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? 'Compris',
      hideCancel: true,
      onConfirm: async () => undefined,
    });
  }

  function closeConfirmDialog() {
    setConfirmDialog((current) => ({ ...current, open: false, onConfirm: null }));
  }

  async function runConfirmDialogAction() {
    if (!confirmDialog.onConfirm) {
      closeConfirmDialog();
      return;
    }

    const action = confirmDialog.onConfirm;
    closeConfirmDialog();
    await action();
  }

  async function uploadImage(file: File, folder: string) {
    const fileExt = file.name.split('.').pop();
    const filePath = `${folder}/${uuidv4()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('fotos_peluqueria').upload(filePath, file, { upsert: true, cacheControl: '3600' });
    if (error) throw error;
    return supabase.storage.from('fotos_peluqueria').getPublicUrl(data.path).data.publicUrl;
  }

  function openCreateGroup() {
    if (!canCreateGroupsAndSubgroups) return;
    setEditor({ kind: 'group', mode: 'create', form: createEmptyGroupForm() });
  }

  function openEditGroup(group: ServiceGroup) {
    if (!canEditServicesContent) return;
    setEditor({
      kind: 'group',
      mode: 'edit',
      form: {
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description ?? '',
        image_url: group.image_url ?? '',
        is_visible: group.is_visible,
        skip_subgroup_step_when_single_visible_child: group.skip_subgroup_step_when_single_visible_child,
        sort_order: group.sort_order,
        slug_manually_edited: group.slug !== slugifyInput(group.name),
      },
    });
  }

  function openCreateSubgroup(groupId: number) {
    if (!canCreateGroupsAndSubgroups) return;
    setEditor({ kind: 'subgroup', mode: 'create', form: createEmptySubgroupForm(groupId) });
  }

  function openEditSubgroup(subgroup: ServiceSubgroup) {
    if (!canEditServicesContent) return;
    setEditor({
      kind: 'subgroup',
      mode: 'edit',
      form: {
        id: subgroup.id,
        group_id: subgroup.group_id,
        name: subgroup.name,
        slug: subgroup.slug,
        description: subgroup.description ?? '',
        is_visible: subgroup.is_visible,
        sort_order: subgroup.sort_order,
        slug_manually_edited: subgroup.slug !== slugifyInput(subgroup.name),
      },
    });
  }

  function openCreateService(groupId: number, subgroupId: number | null = null) {
    if (!canCreateServices) return;
    setEditor({ kind: 'service', mode: 'create', form: createEmptyServiceForm(groupId, subgroupId) });
  }

  function openEditService(service: CatalogService) {
    if (!canEditServicesContent && !canEditServicesBusiness) return;
    setEditor({
      kind: 'service',
      mode: 'edit',
      form: {
        id: service.id,
        nombre: service.nombre,
        slug: service.slug,
        descripcion: service.descripcion,
        precio: Number(service.precio),
        duration: getSafeServiceDuration(service.duration),
        imagen_url: service.imagen_url ?? '',
        active: service.active !== false,
        group_id: service.group_id,
        subgroup_id: service.subgroup_id ?? null,
        sort_order: service.sort_order ?? 0,
        landing_featured: Boolean(service.landing_featured),
        landing_sort_order: service.landing_sort_order ?? null,
        slug_manually_edited: service.slug !== slugifyInput(service.nombre),
      },
    });
  }

  function openDuplicateService(node: ServiceLeafNode) {
    if (!canCreateServices) return;
    const service = node.service;
    setEditor({
      kind: 'service',
      mode: 'create',
      form: {
        id: null,
        nombre: `${service.nombre} Copie`,
        slug: '',
        descripcion: service.descripcion,
        precio: Number(service.precio),
        duration: getSafeServiceDuration(service.duration),
        imagen_url: service.imagen_url ?? '',
        active: service.active !== false,
        group_id: service.group_id,
        subgroup_id: service.subgroup_id ?? null,
        sort_order: service.sort_order ?? 0,
        landing_featured: false,
        landing_sort_order: null,
        slug_manually_edited: false,
      },
    });
  }

  function updateGroupName(name: string) {
    if (!editor || editor.kind !== 'group') return;
    setEditor({
      ...editor,
      form: {
        ...editor.form,
        name,
        slug: editor.form.slug_manually_edited ? editor.form.slug : slugifyInput(name),
      },
    });
  }

  function updateSubgroupName(name: string) {
    if (!editor || editor.kind !== 'subgroup') return;
    setEditor({
      ...editor,
      form: {
        ...editor.form,
        name,
        slug: editor.form.slug_manually_edited ? editor.form.slug : slugifyInput(name),
      },
    });
  }

  function updateServiceName(name: string) {
    if (!editor || editor.kind !== 'service') return;
    setEditor({
      ...editor,
      form: {
        ...editor.form,
        nombre: name,
        slug: editor.form.slug_manually_edited ? editor.form.slug : slugifyInput(name),
      },
    });
  }

  function getNextLandingOrder() {
    const maxOrder = services.reduce((acc, service) => {
      if (!service.landing_featured) return acc;
      return Math.max(acc, service.landing_sort_order ?? 0);
    }, 0);
    return maxOrder + 1;
  }

  function canEnableLandingFeatured(serviceId?: number | null) {
    const featuredCount = services.filter((service) => service.landing_featured && service.id !== serviceId).length;
    return featuredCount < 6;
  }

  async function handleSave() {
    if (!editor) return;
    if (editor.kind === 'service' && (!canEditServicesContent || !canEditServicesBusiness)) {
      setErrorMessage('Vous n’avez pas les permissions suffisantes pour sauvegarder ce service.');
      return;
    }
    if ((editor.kind === 'group' || editor.kind === 'subgroup') && !canEditServicesContent) {
      setErrorMessage('Vous n’avez pas les permissions suffisantes pour modifier cette structure.');
      return;
    }
    setSaving(true);
    setErrorMessage('');

    try {
      if (editor.kind === 'group') {
        let imageUrl = editor.form.image_url;
        if (groupImageFile) {
          imageUrl = await uploadImage(groupImageFile, 'service-groups');
        }

        const payload = {
          name: editor.form.name.trim(),
          slug: editor.form.slug.trim() || null,
          description: editor.form.description.trim() || null,
          image_url: imageUrl || null,
          is_visible: editor.form.is_visible,
          skip_subgroup_step_when_single_visible_child: editor.form.skip_subgroup_step_when_single_visible_child,
          sort_order: editor.form.sort_order,
        };

        if (editor.mode === 'create') {
          const { error } = await supabase.from('service_groups').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('service_groups').update(payload).eq('id', editor.form.id);
          if (error) throw error;
        }
      }

      if (editor.kind === 'subgroup') {
        const payload = {
          group_id: editor.form.group_id,
          name: editor.form.name.trim(),
          slug: editor.form.slug.trim() || null,
          description: editor.form.description.trim() || null,
          is_visible: editor.form.is_visible,
          sort_order: editor.form.sort_order,
        };

        if (editor.mode === 'create') {
          const { error } = await supabase.from('service_subgroups').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('service_subgroups').update(payload).eq('id', editor.form.id);
          if (error) throw error;
        }
      }

      if (editor.kind === 'service') {
        const durationError = getServiceDurationValidationMessage(editor.form.duration);
        if (durationError) {
          throw new Error(durationError);
        }
        if (editor.form.landing_featured && !canEnableLandingFeatured(editor.form.id)) {
          throw new Error('Maximum 6 services mis en avant sur la landing');
        }

        let imageUrl = editor.form.imagen_url;
        if (serviceImageFile) {
          imageUrl = await uploadImage(serviceImageFile, 'servicios');
        }

        const payload = {
          nombre: editor.form.nombre.trim(),
          slug: editor.form.slug.trim() || null,
          descripcion: editor.form.descripcion.trim(),
          precio: editor.form.precio,
          duration: getSafeServiceDuration(editor.form.duration),
          imagen_url: imageUrl || '',
          active: editor.form.active,
          group_id: editor.form.group_id,
          subgroup_id: editor.form.subgroup_id,
          sort_order: editor.form.sort_order,
          landing_featured: editor.form.landing_featured,
          landing_sort_order: editor.form.landing_featured ? editor.form.landing_sort_order ?? getNextLandingOrder() : null,
        };

        if (editor.mode === 'create') {
          const { error } = await supabase.from('servicios').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('servicios').update(payload).eq('id', editor.form.id);
          if (error) throw error;
        }
      }

      closeEditor();
      await loadCatalog();
    } catch (error) {
      console.error('Erreur sauvegarde catalogue:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function toggleNodeVisibility(kind: EditorKind, id: number, value: boolean) {
    if (!canEditServicesContent) return;
    try {
      if (kind === 'group') {
        const { error } = await supabase.from('service_groups').update({ is_visible: value }).eq('id', id);
        if (error) throw error;
      }
      if (kind === 'subgroup') {
        const { error } = await supabase.from('service_subgroups').update({ is_visible: value }).eq('id', id);
        if (error) throw error;
      }
      if (kind === 'service') {
        const { error } = await supabase.from('servicios').update({ active: value }).eq('id', id);
        if (error) throw error;
      }
      await loadCatalog();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur visibilite');
    }
  }

  async function toggleLandingFeatured(node: ServiceLeafNode, value: boolean) {
    if (!canEditServicesContent) return;
    try {
      if (value && !canEnableLandingFeatured(node.service.id)) {
        setErrorMessage('Maximum 6 services mis en avant sur la landing');
        return;
      }
      const payload = {
        landing_featured: value,
        landing_sort_order: value ? node.service.landing_sort_order ?? getNextLandingOrder() : null,
      };
      const { error } = await supabase.from('servicios').update(payload).eq('id', node.service.id);
      if (error) throw error;
      await loadCatalog();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur mise en avant landing');
    }
  }


  async function deleteService(node: ServiceLeafNode) {
    if (!canDeleteServices) return;
    const serviceId = node.service.id;

    try {
      const { count, error: countError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('service_id', serviceId);

      if (countError) throw countError;

      const bookingCount = count ?? 0;
      requestConfirmation({
        title: 'Supprimer ce service ?',
        description:
          bookingCount > 0
            ? `Ce service sera retiré du catalogue actif. ${bookingCount} réservation(s) historique(s) seront conservées et le service restera archivé dans l’admin.`
            : 'Ce service sera retiré du catalogue actif, sans suppression définitive.',
        confirmLabel: 'Retirer',
        confirmTone: 'danger',
        onConfirm: async () => {
          const { error } = await supabase.from('servicios').update({ active: false }).eq('id', serviceId);
          if (error) throw error;

          if (editor?.kind === 'service' && editor.form.id === serviceId) {
            closeEditor();
          }

          await loadCatalog();
        },
      });
    } catch (error) {
      console.error('Erreur suppression service:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la suppression du service');
    }
  }


  async function deleteEmptyGroup(groupNode: ServiceGroupNode) {
    if (!canDeleteServices) return;
    if (groupNode.mode !== 'empty') {
      requestAlert({
        title: 'Suppression impossible',
        description: `Le groupe ${groupNode.group.name} contient encore des services ou des sous-groupes. Supprimez ou re-déplacez d'abord son contenu vers un autre groupe.`,
      });
      return;
    }

    requestConfirmation({
      title: 'Supprimer ce groupe ? ',
      description: `Le groupe ${groupNode.group.name} sera supprimé définitivement.`,
      confirmLabel: 'Supprimer',
      confirmTone: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('service_groups').delete().eq('id', groupNode.group.id);
          if (error) throw error;
          if (editor?.kind === 'group' && editor.form.id === groupNode.group.id) {
            closeEditor();
          }
          await loadCatalog();
        } catch (error) {
          console.error('Erreur suppression groupe:', error);
          setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la suppression du groupe');
        }
      },
    });
  }

  async function deleteEmptySubgroup(groupNode: ServiceGroupNode, subgroupNode: ServiceSubgroupNode) {
    if (!canDeleteServices) return;
    if (subgroupNode.services.length > 0) {
      requestAlert({
        title: 'Suppression impossible',
        description: `Le sous-groupe ${subgroupNode.subgroup.name} contient encore des services. Supprimez-les ou re-déplacez-les avant de supprimer ce sous-groupe.`,
      });
      return;
    }

    requestConfirmation({
      title: 'Supprimer ce sous-groupe ? ',
      description: `Le sous-groupe ${subgroupNode.subgroup.name} sera supprimé définitivement du groupe ${groupNode.group.name}.`,
      confirmLabel: 'Supprimer',
      confirmTone: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('service_subgroups').delete().eq('id', subgroupNode.subgroup.id);
          if (error) throw error;
          if (editor?.kind === 'subgroup' && editor.form.id === subgroupNode.subgroup.id) {
            closeEditor();
          }
          await loadCatalog();
        } catch (error) {
          console.error('Erreur suppression sous-groupe:', error);
          setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la suppression du sous-groupe');
        }
      },
    });
  }

  async function convertSingleSubgroupToDirectServices(groupNode: ServiceGroupNode, subgroupNode: ServiceSubgroupNode) {
    if (!canEditServicesContent) return;
    if (groupNode.mode !== 'subgroups' || groupNode.subgroups.length !== 1) {
      setErrorMessage("Cette conversion n'est possible que si le groupe contient un seul sous-groupe.");
      return;
    }

    requestConfirmation({
      title: 'Convertir en services directs ?',
      description: `Les services de ${subgroupNode.subgroup.name} seront déplacés directement dans ${groupNode.group.name} et le sous-groupe sera supprimé.`,
      confirmLabel: 'Convertir',
      onConfirm: async () => {
        try {
          setErrorMessage('');
          const { error } = await supabase.rpc('convert_group_single_subgroup_to_direct_services', { p_group_id: groupNode.group.id });
          if (error) throw error;
          await loadCatalog();
        } catch (error) {
          console.error('Erreur conversion sous-groupe vers services directs:', error);
          setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la conversion du groupe');
        }
      },
    });
  }

  async function moveNode(kind: EditorKind, currentId: number, direction: 'up' | 'down', scopeIds: number[]) {
    if (!canEditServicesContent) return;
    const currentIndex = scopeIds.indexOf(currentId);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || swapIndex < 0 || swapIndex >= scopeIds.length) return;

    const firstId = scopeIds[currentIndex];
    const secondId = scopeIds[swapIndex];

    const source = kind === 'group' ? groups : kind === 'subgroup' ? subgroups : services;
    const first = source.find((item) => item.id === firstId);
    const second = source.find((item) => item.id === secondId);
    if (!first || !second) return;

    const firstOrder = first.sort_order ?? 0;
    const secondOrder = second.sort_order ?? 0;

    try {
      if (kind === 'group') {
        const { error: firstError } = await supabase.from('service_groups').update({ sort_order: secondOrder }).eq('id', firstId);
        if (firstError) throw firstError;
        const { error: secondError } = await supabase.from('service_groups').update({ sort_order: firstOrder }).eq('id', secondId);
        if (secondError) throw secondError;
      }
      if (kind === 'subgroup') {
        const { error: firstError } = await supabase.from('service_subgroups').update({ sort_order: secondOrder }).eq('id', firstId);
        if (firstError) throw firstError;
        const { error: secondError } = await supabase.from('service_subgroups').update({ sort_order: firstOrder }).eq('id', secondId);
        if (secondError) throw secondError;
      }
      if (kind === 'service') {
        const { error: firstError } = await supabase.from('servicios').update({ sort_order: secondOrder }).eq('id', firstId);
        if (firstError) throw firstError;
        const { error: secondError } = await supabase.from('servicios').update({ sort_order: firstOrder }).eq('id', secondId);
        if (secondError) throw secondError;
      }
      await loadCatalog();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur reordonnancement');
    }
  }

  function getGroupScopeIds() {
    return filteredCatalog.map((item) => item.group.id);
  }

  function getSubgroupScopeIds(group: ServiceGroupNode) {
    return group.subgroups.map((item) => item.subgroup.id);
  }

  function getServiceScopeIds(group: ServiceGroupNode, subgroup: ServiceSubgroupNode | null) {
    return subgroup ? subgroup.services.map((item) => item.service.id) : group.services.map((item) => item.service.id);
  }

  function renderNodeMenu(content: React.ReactNode, key: string) {
    return <FloatingNodeMenu content={content} menuKey={key} openMenuKey={openMenuKey} setOpenMenuKey={setOpenMenuKey} />;
  }

  function renderServiceNode(groupNode: ServiceGroupNode, subgroupNode: ServiceSubgroupNode | null, node: ServiceLeafNode) {
    return (
      <div key={node.service.id} className="relative overflow-visible rounded-2xl border border-border bg-card">
        <div className="flex min-w-0 flex-col gap-3 px-4 py-4 md:flex-row md:items-center">
          <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-xl border border-border md:h-20 md:w-28">
            {node.service.imagen_url ? (
              <Image src={getImageUrl(node.service.imagen_url)} alt={node.service.nombre} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted/40 text-2xl font-bold text-primary">{node.service.nombre.charAt(0)}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h5 className="truncate text-sm font-semibold text-foreground">{node.service.nombre}</h5>
              <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] text-secondary-foreground">{node.configuredVisible ? 'Visible' : 'Masqué'}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{node.effectiveVisible ? 'Effectif' : 'Hors public'}</span>
              {node.service.landing_featured ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Landing</span> : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">/{node.service.slug}</p>
            <p className="mt-1 text-sm text-muted-foreground">{node.service.descripcion}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{node.service.precio} CHF</span>
              <span>{getSafeServiceDuration(node.service.duration)} min</span>
              {subgroupNode ? <span>{groupNode.group.name} / {subgroupNode.subgroup.name}</span> : <span>{groupNode.group.name}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><span>Visible</span><input type="checkbox" disabled={!canEditServicesContent} checked={node.service.active !== false} onChange={(e) => void toggleNodeVisibility('service', node.service.id, e.target.checked)} /></label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><span>Landing</span><input type="checkbox" disabled={!canEditServicesContent} checked={Boolean(node.service.landing_featured)} onChange={(e) => void toggleLandingFeatured(node, e.target.checked)} /></label>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canEditServicesContent} onClick={() => void moveNode('service', node.service.id, 'up', getServiceScopeIds(groupNode, subgroupNode))}><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canEditServicesContent} onClick={() => void moveNode('service', node.service.id, 'down', getServiceScopeIds(groupNode, subgroupNode))}><ArrowDown className="h-4 w-4" /></Button>
            </div>
            {!isReadOnly ? renderNodeMenu(
              <div className="space-y-1">
                {(canEditServicesContent || canEditServicesBusiness) ? <Button type="button" variant="ghost" className="w-full justify-start whitespace-normal" onClick={() => openEditService(node.service)}>Modifier le service</Button> : null}
                {canCreateServices ? <Button type="button" variant="ghost" className="w-full justify-start whitespace-normal" onClick={() => openDuplicateService(node)}>Dupliquer le service</Button> : null}
                {canDeleteServices ? <Button type="button" variant="ghost" className="w-full justify-start whitespace-normal text-destructive hover:text-destructive" onClick={() => void deleteService(node)}>Retirer le service</Button> : null}
              </div>,
              `${makeNodeKey('service', node.service.id)}:menu`
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  function renderSubgroupNode(groupNode: ServiceGroupNode, subgroupNode: ServiceSubgroupNode) {
    const key = makeNodeKey('subgroup', subgroupNode.subgroup.id);
    const isExpanded = expanded[key] ?? true;

    return (
      <div key={subgroupNode.subgroup.id} className="relative overflow-visible rounded-2xl border border-border/70 bg-background">
        <div className="flex min-w-0 items-center gap-3 border-b border-border/70 px-4 py-3">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleExpanded(key)}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-semibold text-foreground">{subgroupNode.subgroup.name}</h4>
              <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] text-secondary-foreground">{subgroupNode.configuredVisible ? 'Visible' : 'Masqué'}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{subgroupNode.effectiveVisible ? 'Effectif' : 'Hors public'}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{subgroupNode.visibleServiceCount} services visibles</span>
            </div>
            <p className="truncate text-xs text-muted-foreground">/{subgroupNode.subgroup.slug}</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground"><span>Visible</span><input type="checkbox" disabled={!canEditServicesContent} checked={subgroupNode.subgroup.is_visible} onChange={(e) => void toggleNodeVisibility('subgroup', subgroupNode.subgroup.id, e.target.checked)} /></label>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canEditServicesContent} onClick={() => void moveNode('subgroup', subgroupNode.subgroup.id, 'up', getSubgroupScopeIds(groupNode))}><ArrowUp className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canEditServicesContent} onClick={() => void moveNode('subgroup', subgroupNode.subgroup.id, 'down', getSubgroupScopeIds(groupNode))}><ArrowDown className="h-4 w-4" /></Button>
          </div>
          {!isReadOnly ? renderNodeMenu(
            <div className="space-y-1">
              {canEditServicesContent ? <Button type="button" variant="ghost" className="w-full justify-start whitespace-normal" onClick={() => openEditSubgroup(subgroupNode.subgroup)}>Modifier le sous-groupe</Button> : null}
              {canCreateServices ? <Button type="button" variant="ghost" className="w-full justify-start whitespace-normal" onClick={() => openCreateService(groupNode.group.id, subgroupNode.subgroup.id)}>Nouveau service</Button> : null}
              {canEditServicesContent && groupNode.subgroups.length === 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start whitespace-normal"
                  onClick={() => void convertSingleSubgroupToDirectServices(groupNode, subgroupNode)}
                >
                  Convertir en services directs
                </Button>
              ) : null}
              {canDeleteServices ? <Button
                type="button"
                variant="ghost"
                className="w-full justify-start whitespace-normal text-destructive hover:text-destructive"
                onClick={() => void deleteEmptySubgroup(groupNode, subgroupNode)}
              >
                Supprimer le sous-groupe
              </Button> : null}
            </div>,
            `${key}:menu`
          ) : null}
        </div>
        {isExpanded ? (
          <div className="space-y-3 p-4">
            {subgroupNode.subgroup.description ? <p className="text-sm text-muted-foreground">{subgroupNode.subgroup.description}</p> : null}
            {subgroupNode.services.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Aucun service dans ce sous-groupe.</div> : subgroupNode.services.map((service) => renderServiceNode(groupNode, subgroupNode, service))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderGroupNode(groupNode: ServiceGroupNode) {
    const key = makeNodeKey('group', groupNode.group.id);
    const isExpanded = expanded[key] ?? true;

    return (
      <article key={groupNode.group.id} className="relative overflow-visible rounded-2xl border border-border bg-card shadow-[var(--admin-shadow-card)]">
        <div className="flex min-w-0 items-center gap-3 border-b border-border px-4 py-3">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleExpanded(key)}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">{groupNode.group.name}</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{groupNode.mode === 'subgroups' ? 'Sous-groupes' : groupNode.mode === 'services' ? 'Services directs' : 'Vide'}</span>
              <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-xs text-secondary-foreground">{groupNode.configuredVisible ? 'Visible' : 'Masqué'}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{groupNode.effectiveVisible ? 'Effectif' : 'Hors public'}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{groupNode.visibleServiceCount} services visibles</span>
            </div>
            <p className="truncate text-xs text-muted-foreground">/{groupNode.group.slug}</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground"><span>Visible</span><input type="checkbox" disabled={!canEditServicesContent} checked={groupNode.group.is_visible} onChange={(e) => void toggleNodeVisibility('group', groupNode.group.id, e.target.checked)} /></label>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canEditServicesContent} onClick={() => void moveNode('group', groupNode.group.id, 'up', getGroupScopeIds())}><ArrowUp className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canEditServicesContent} onClick={() => void moveNode('group', groupNode.group.id, 'down', getGroupScopeIds())}><ArrowDown className="h-4 w-4" /></Button>
          </div>
          {!isReadOnly ? renderNodeMenu(
            <div className="space-y-1">
              {canEditServicesContent ? <Button type="button" variant="ghost" className="w-full justify-start whitespace-normal" onClick={() => openEditGroup(groupNode.group)}>Modifier le groupe</Button> : null}
              {canCreateServices && (groupNode.mode === 'empty' || groupNode.mode === 'services') ? <Button type="button" variant="ghost" className="w-full justify-start whitespace-normal" onClick={() => openCreateService(groupNode.group.id)}>Nouveau service direct</Button> : null}
              {canCreateGroupsAndSubgroups && (groupNode.mode === 'empty' || groupNode.mode === 'subgroups') ? <Button type="button" variant="ghost" className="w-full justify-start whitespace-normal" onClick={() => openCreateSubgroup(groupNode.group.id)}>Nouveau sous-groupe</Button> : null}
              {canDeleteServices ? <Button type="button" variant="ghost" className="w-full justify-start whitespace-normal text-destructive hover:text-destructive" onClick={() => void deleteEmptyGroup(groupNode)}>Supprimer le groupe</Button> : null}
            </div>,
            `${key}:menu`
          ) : null}
        </div>
        {isExpanded ? (
          <div className="space-y-3 p-4">
            {groupNode.group.description ? <p className="text-sm text-muted-foreground">{groupNode.group.description}</p> : null}
            {groupNode.group.image_url ? <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border"><Image src={getImageUrl(groupNode.group.image_url)} alt={groupNode.group.name} fill className="object-cover" /></div> : null}
            {groupNode.mode === 'services' && groupNode.services.length > 0 ? <div className="space-y-3">{groupNode.services.map((service) => renderServiceNode(groupNode, null, service))}</div> : null}
            {groupNode.mode === 'subgroups' && groupNode.subgroups.length > 0 ? <div className="space-y-3">{groupNode.subgroups.map((subgroup) => renderSubgroupNode(groupNode, subgroup))}</div> : null}
            {groupNode.mode === 'empty' ? <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">Groupe vide. Créez ici un premier service direct ou un sous-groupe pour définir son mode.</div> : null}
          </div>
        ) : null}
      </article>
    );
  }

  function renderEditorBody() {
    if (!editor) return null;
    if (editor.kind === 'group') {
      return (
        <fieldset className="space-y-4" disabled={!canEditServicesContent}>
          <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom</label><Input value={editor.form.name} onChange={(e) => updateGroupName(e.target.value)} /></div>
          <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slug</label><Input value={editor.form.slug} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, slug: slugifyInput(e.target.value), slug_manually_edited: e.target.value.trim() !== '' } })} placeholder="auto" /></div>
          <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label><Textarea value={editor.form.description} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, description: e.target.value } })} rows={4} /></div>
          <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image</label><Input type="file" accept="image/*" onChange={(e) => setGroupImageFile(e.target.files?.[0] ?? null)} /><Input value={editor.form.image_url} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, image_url: e.target.value } })} placeholder="URL publique existante" /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={editor.form.is_visible} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, is_visible: e.target.checked } })} />Visible</label>
            <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={editor.form.skip_subgroup_step_when_single_visible_child} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, skip_subgroup_step_when_single_visible_child: e.target.checked } })} />Omettre le sous-groupe s&apos;il est seul</label>
          </div>
        </fieldset>
      );
    }
    if (editor.kind === 'subgroup') {
      return (
        <fieldset className="space-y-4" disabled={!canEditServicesContent}>
          <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Groupe parent</label><select className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={editor.form.group_id ?? ''} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, group_id: Number(e.target.value) } })}><option value="">Sélectionner</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div>
          <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom</label><Input value={editor.form.name} onChange={(e) => updateSubgroupName(e.target.value)} /></div>
          <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slug</label><Input value={editor.form.slug} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, slug: slugifyInput(e.target.value), slug_manually_edited: e.target.value.trim() !== '' } })} placeholder="auto" /></div>
          <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label><Textarea value={editor.form.description} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, description: e.target.value } })} rows={4} /></div>
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={editor.form.is_visible} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, is_visible: e.target.checked } })} />Visible</label>
        </fieldset>
      );
    }
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="space-y-2" disabled={!canEditServicesContent}><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Groupe</label><select className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={editor.form.group_id ?? ''} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, group_id: Number(e.target.value), subgroup_id: null } })}><option value="">Sélectionner</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></fieldset>
          <fieldset className="space-y-2" disabled={!canEditServicesContent}><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sous-groupe (optionnel)</label><select className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={editor.form.subgroup_id ?? ''} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, subgroup_id: e.target.value ? Number(e.target.value) : null } })}><option value="">Aucun (service direct)</option>{subgroups.filter((subgroup) => subgroup.group_id === editor.form.group_id).map((subgroup) => <option key={subgroup.id} value={subgroup.id}>{subgroup.name}</option>)}</select></fieldset>
        </div>
        <fieldset className="space-y-2" disabled={!canEditServicesContent}><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom</label><Input value={editor.form.nombre} onChange={(e) => updateServiceName(e.target.value)} /></fieldset>
        <fieldset className="space-y-2" disabled={!canEditServicesContent}><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slug</label><Input value={editor.form.slug} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, slug: slugifyInput(e.target.value), slug_manually_edited: e.target.value.trim() !== '' } })} placeholder="auto" /></fieldset>
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="space-y-2" disabled={!canEditServicesBusiness}><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prix (CHF)</label><Input type="number" value={editor.form.precio} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, precio: Number(e.target.value) } })} /></fieldset>
          <fieldset className="space-y-2" disabled={!canEditServicesBusiness}><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Durée (min)</label><Input type="number" value={editor.form.duration} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, duration: Number(e.target.value) } })} /></fieldset>
        </div>
        <fieldset className="space-y-2" disabled={!canEditServicesContent}><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label><Textarea value={editor.form.descripcion} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, descripcion: e.target.value } })} rows={4} /></fieldset>
        <fieldset className="space-y-2" disabled={!canEditServicesContent}><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image</label><Input type="file" accept="image/*" onChange={(e) => setServiceImageFile(e.target.files?.[0] ?? null)} /><Input value={editor.form.imagen_url} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, imagen_url: e.target.value } })} placeholder="URL publique existante" /></fieldset>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" disabled={!canEditServicesContent} checked={editor.form.active} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, active: e.target.checked } })} />Visible</label>
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" disabled={!canEditServicesContent} checked={editor.form.landing_featured} onChange={(e) => {
            if (e.target.checked && !canEnableLandingFeatured(editor.form.id)) {
              setErrorMessage('Maximum 6 services mis en avant sur la landing');
              return;
            }
            setEditor({ ...editor, form: { ...editor.form, landing_featured: e.target.checked, landing_sort_order: e.target.checked ? (editor.form.landing_sort_order ?? getNextLandingOrder()) : null } });
          }} />Mettre en avant sur la landing</label>
        </div>
        {editor.form.landing_featured ? <fieldset className="space-y-2" disabled={!canEditServicesContent}><label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ordre landing</label><Input type="number" value={editor.form.landing_sort_order ?? 0} onChange={(e) => setEditor({ ...editor, form: { ...editor.form, landing_sort_order: Number(e.target.value) } })} /></fieldset> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <SectionHeader
        title="Gestion des services"
        description="Catalogue hiérarchique groupes / sous-groupes / services, visibilité publique et sélection landing."
        actions={
          <div className="flex w-full min-w-0 flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <div className="relative min-w-0 md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher groupe, sous-groupe ou service" className="pl-9" />
            </div>
            {canCreateGroupsAndSubgroups ? <Button type="button" onClick={openCreateGroup}><Plus className="h-4 w-4" />Nouveau groupe</Button> : null}
          </div>
        }
      />
      {!canViewServices ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Vous n’avez pas accès au catalogue des services.</div> : null}
      {canViewServices && isReadOnly ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Accès en lecture seule: le catalogue reste visible, mais les actions de modification sont désactivées.</div> : null}
      {errorMessage ? <div className="rounded-xl border border-destructive/45 bg-destructive/10 p-3 text-sm text-destructive-foreground">{errorMessage}</div> : null}
      {canViewServices ? <AdminCard>
        <AdminCardHeader><h3 className="text-xl font-semibold text-primary">Services mis en avant sur la landing</h3></AdminCardHeader>
        <AdminCardContent>
          {featuredLanding.length === 0 ? <p className="text-sm text-muted-foreground">Aucun service mis en avant pour l&apos;instant.</p> : <div className="flex flex-wrap gap-2">{featuredLanding.map((item) => <span key={item.service.id} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><Star className="h-3.5 w-3.5" />{item.service.nombre}</span>)}</div>}
        </AdminCardContent>
      </AdminCard> : null}
      {canViewServices ? (loading ? <AdminCard><AdminCardContent><div className="p-4 text-sm text-muted-foreground">Chargement du catalogue...</div></AdminCardContent></AdminCard> : <div className="space-y-4">{filteredCatalog.map((groupNode) => renderGroupNode(groupNode))}</div>) : null}

      <Dialog open={confirmDialog.open} onOpenChange={(open) => { if (!open) closeConfirmDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            {!confirmDialog.hideCancel ? <Button type="button" variant="outline" onClick={closeConfirmDialog}>{confirmDialog.cancelLabel ?? 'Annuler'}</Button> : null}
            <Button
              type="button"
              variant={confirmDialog.confirmTone === 'danger' ? 'destructive' : 'default'}
              onClick={() => void runConfirmDialogAction()}
            >
              {confirmDialog.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminSidePanel
        open={Boolean(editor)}
        onOpenChange={(open) => { if (!open) closeEditor(); }}
        title={editor ? `${editor.mode === 'create' ? 'Créer' : 'Modifier'} ${editor.kind === 'group' ? 'un groupe' : editor.kind === 'subgroup' ? 'un sous-groupe' : 'un service'}` : 'Édition'}
        description="Les validations structurelles sont appliquées au niveau du modèle et de la base de données."
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {canDeleteServices && editor?.kind === 'group' && editor.mode === 'edit' && editingGroupNode ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void deleteEmptyGroup(editingGroupNode)}
                >
                  Supprimer le groupe
                </Button>
              ) : null}
              {canDeleteServices && editor?.kind === 'subgroup' && editor.mode === 'edit' && editingSubgroupNode ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void deleteEmptySubgroup(editingSubgroupNode.groupNode, editingSubgroupNode.subgroupNode)}
                >
                  Supprimer le sous-groupe
                </Button>
              ) : null}
              {canDeleteServices && editor?.kind === 'service' && editor.mode === 'edit' && editingServiceNode ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void deleteService(editingServiceNode)}
                >
                  Retirer le service
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeEditor}>Annuler</Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving || !canSaveEditor}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
            </div>
          </div>
        }
      >
        {renderEditorBody()}
      </AdminSidePanel>
    </div>
  );
}
