"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StaffRoleSummary } from "@/features/personal-api/staff-role-summary";
import { FilterChecks } from "@/components/ui/filter-checks";
import { readSelectionPages } from "@/features/operations/selection-pages";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import catalogStyles from "./catalog.module.css";
import { ManagementHeading } from "@/components/ui/management-page";
import { useApiWorkspace } from "./api-workspace-shell";
import { resources, resourceCategoryFilters, resourceAllowed, type ResourceKey } from "./resources";
import { createWorkspaceRepository, type ApiPage, type ApiRecord } from "./workspace-repository";
import { EmployeeApiScreen } from "@/features/employee-api/employee-screen";
import { SupplierScreen } from "@/features/suppliers-api/supplier-screen";
import { useScopedZones } from "./selected-zones";
import { workspaceError } from "./workspace-error";
import { GlobalZoneMap } from "@/features/farming-api/global-zone-map";
import { loadOptions } from "@/features/operations/lookups";
import { useDirectoryView } from "@/components/ui/use-directory-view";
import { ResourceEditor } from "./api-resource-editor";
import { ResourcePager, ResourceViewToggle } from "./api-resource-list-controls";
import { ResourceGridCards, ResourceTable } from "./api-resource-list-views";
import {
  directoryActions,
  directoryPresentation,
  inputClass,
  resultTitleFor,
  searchPlaceholderFor,
  statusOptions,
  text,
} from "./api-resource-presentation";
export { workspaceError } from "./workspace-error";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Directory screen for a workspace resource; employees have their own dedicated screen. */
export function ApiResourceScreen({ resource }: { resource: ResourceKey }) {
  if (resource === "suppliers") return <SupplierScreen />;
  return resource === "employees" ? <EmployeeApiScreen /> : <GenericResourceScreen resource={resource} />;
}

function GenericResourceScreen({ resource }: { resource: ResourceKey }) {
  const context = useApiWorkspace();
  const params = useSearchParams();
  // A single valid ?accountId= (accounts) or ?recordId= (zones, rafts) opens that record directly.
  const accountQuery = params.getAll(resource === "accounts" ? "accountId" : "recordId");
  const initialAccountId =
    ["accounts", "zones", "rafts", "input-items"].includes(resource) && accountQuery.length === 1 && UUID_PATTERN.test(accountQuery[0])
      ? accountQuery[0]
      : undefined;
  const definition = resources[resource];
  const categoryFilter = resourceCategoryFilters[resource];
  const repository = useMemo(() => createWorkspaceRepository(resource), [resource]);
  const [page, setPage] = useState<ApiPage>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [view, setView] = useDirectoryView(resource, "grid", ["grid", "table"] as const);
  const [refresh, setRefresh] = useState(0);
  const [zones, setZones] = useState<ApiRecord[]>([]);
  const [zoneError, setZoneError] = useState<string>();
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneRefresh, setZoneRefresh] = useState(0);
  const [zoneChoice, setZoneId] = useState("");
  const [expandedSupplier, setExpandedSupplier] = useState<string>();
  // undefined = editor closed, null = new record.
  const [selected, setSelected] = useState<ApiRecord | null>();
  // The header zone picker narrows the zones offered for a new record.
  const { zones: offeredZones, zoneId } = useScopedZones(zones, zoneChoice, typeof selected?.zoneId === "string" ? selected.zoneId : undefined);
  // Bumped to remount the editor with fresh state.
  const [editorId, setEditorId] = useState(0);
  const [opening, setOpening] = useState(false);
  // Incremented on every open/close so a stale detail response cannot reopen the editor.
  const openGeneration = useRef(0);
  const [notice, setNotice] = useState<string>();

  const canView = resourceAllowed(resource, context.identity, context.permissions.functionPermissions);
  const canCreate =
    definition.editable &&
    definition.creatable !== false &&
    resourceAllowed(resource, context.identity, context.permissions.functionPermissions, "Create");
  const canEdit =
    definition.editable && resourceAllowed(resource, context.identity, context.permissions.functionPermissions, "Edit");

  // Open the record named in the URL once the user may view this resource.
  useEffect(() => {
    if (!initialAccountId || !canView) return;
    const controller = new AbortController();
    const generation = ++openGeneration.current;
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setOpening(true);
      setError(undefined);
      const result = await repository.detail(initialAccountId, controller.signal);
      if (controller.signal.aborted || generation !== openGeneration.current) return;
      setOpening(false);
      if (result.status === "success") {
        if (resource === "rafts" && typeof result.data.zoneId === "string") setZoneId(result.data.zoneId);
        setSelected(result.data);
        setEditorId((value) => value + 1);
      } else setError(workspaceError(result));
    });
    return () => {
      controller.abort();
    };
  }, [initialAccountId, canView, repository, resource]);

  // Zone-scoped resources load the zone list and keep the current zone when it still exists.
  useEffect(() => {
    const controller = new AbortController();
    if (definition.zoneRequired && canView) {
      void Promise.resolve().then(async () => {
        if (controller.signal.aborted) return;
        setZoneLoading(true);
        setZoneError(undefined);
        const result = await loadOptions("zones", controller.signal);
        if (controller.signal.aborted) return;
        setZoneLoading(false);
        if (result.status === "success") {
          setZones(result.data);
          setZoneId((current) =>
            result.data.some((zone) => zone.id === current) ? current : result.data[0]?.id || "",
          );
        } else {
          setZones([]);
          setZoneId("");
          setZoneError(workspaceError(result));
        }
      });
    }
    return () => controller.abort();
  }, [definition.zoneRequired, canView, zoneRefresh]);

  // Debounced list load; multi-select status/category filters fan out into several requests.
  useEffect(() => {
    const controller = new AbortController();
    if (!canView || (definition.zoneRequired && !zoneId)) return () => controller.abort();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(undefined);
      void readSelectionPages(
        (query, signal) =>
          repository.list(
            Object.fromEntries(
              Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined),
            ),
            signal,
          ),
        {
          page: String(pageNumber),
          pageSize: String(pageSize),
          ...(search ? { search } : {}),
          ...(zoneId ? { zoneId } : {}),
        },
        { statusId: filter, ...(categoryFilter ? { [categoryFilter.key]: category } : {}) },
        controller.signal,
      ).then((result) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (result.status === "success") {
          setPage(result.data);
          if (result.data.page !== pageNumber) setPageNumber(result.data.page);
        } else {
          setPage(undefined);
          setError(workspaceError(result));
        }
      });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    repository,
    resource,
    search,
    filter,
    category,
    categoryFilter,
    pageNumber,
    pageSize,
    refresh,
    zoneId,
    canView,
    definition,
  ]);
  // Invalidate in-flight opens on unmount.
  useEffect(
    () => () => {
      openGeneration.current++;
    },
    [],
  );

  async function open(record: ApiRecord) {
    const generation = ++openGeneration.current;
    setOpening(true);
    setError(undefined);
    const result = await repository.detail(record.id);
    if (generation !== openGeneration.current) return;
    setOpening(false);
    if (result.status === "success") {
      setSelected(result.data);
      setEditorId((value) => value + 1);
    } else setError(workspaceError(result));
  }

  if (!canView)
    return (
      <p role="alert" className="rounded-card border border-border bg-surface p-6">
        Bạn không có quyền xem chức năng này.
      </p>
    );

  const statuses = statusOptions(resource);
  const presentation = directoryPresentation[resource as keyof typeof directoryPresentation];
  const actions = directoryActions[resource];
  const customerDirectory = resource === "customers";
  const accessDirectory = resource === "accounts" || resource === "roles";
  const usesFilterRail = resource !== "customers" && resource !== "roles";
  const isMapResource = resource === "zones" || resource === "rafts";

  const filters = (
    <div
      className={
        usesFilterRail
          ? catalogStyles.filters
          : "grid gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
      }
    >
      {resource !== "roles" && resource !== "customers" && (
        <FilterChecks
          label="Trạng thái"
          value={filter}
          options={statuses}
          onChange={(value) => {
            setFilter(value);
            setPageNumber(1);
          }}
        />
      )}
      {categoryFilter && (
        <FilterChecks
          label={categoryFilter.label}
          value={category}
          options={categoryFilter.options}
          onChange={(value) => {
            setCategory(value);
            setPageNumber(1);
          }}
        />
      )}
      {definition.zoneRequired && (
        <label className="min-w-0 text-sm font-semibold">
          Vùng nuôi
          <select
            className={inputClass}
            disabled={zoneLoading || !!zoneError}
            value={zoneId}
            onChange={(event) => {
              setZoneId(event.target.value);
              setPageNumber(1);
            }}
          >
            <option value="">Chọn vùng</option>
            {offeredZones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {text(zone.name)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
  const searchControl = (
    <label className={catalogStyles.search}>
      Tìm kiếm
      <input
        type="search"
        placeholder={searchPlaceholderFor(resource)}
        className={inputClass}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPageNumber(1);
        }}
      />
    </label>
  );
  const results = (
    <>
      {!usesFilterRail && searchControl}
      {zoneError && (
        <div role="alert" className="mt-4 rounded-control border border-danger p-4">
          <p>{zoneError}</p>
          <Button
            className="mt-3 w-auto"
            variant="secondary"
            disabled={zoneLoading}
            onClick={() => setZoneRefresh((value) => value + 1)}
          >
            Tải lại danh mục vùng
          </Button>
        </div>
      )}
      {zoneLoading && (
        <p role="status" className="mt-3">
          Đang tải danh mục vùng...
        </p>
      )}
      {isMapResource && (
        <ResourceViewToggle resource={resource} total={page?.total ?? 0} view={view} onViewChange={setView} />
      )}
      {!usesFilterRail && error && <p className="text-sm text-text-muted">Chưa tải được dữ liệu</p>}
      {notice && (
        <p role="status" className="mt-4 text-primary">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="mt-4 rounded-control border border-danger p-4">
          <p>{error}</p>
          <Button className="mt-3 w-auto" variant="secondary" onClick={() => setRefresh((value) => value + 1)}>
            Tải lại
          </Button>
        </div>
      )}
      {definition.zoneRequired && !zoneId ? (
        <p className="mt-5">Chọn vùng nuôi để xem danh sách bè.</p>
      ) : loading ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Đang tải danh sách">
          {[1, 2, 3, 4].map((value) => (
            <div key={value} className="h-14 animate-pulse rounded-control bg-slate-200" />
          ))}
        </div>
      ) : (customerDirectory || accessDirectory) && error ? null : isMapResource && view === "grid" ? (
        <ResourceGridCards
          resource={resource}
          definition={definition}
          items={page?.items}
          opening={opening}
          onOpen={(row) => void open(row)}
        />
      ) : (
        <ResourceTable
          resource={resource}
          definition={definition}
          items={page?.items}
          opening={opening}
          usesFilterRail={usesFilterRail}
          expandedSupplier={expandedSupplier}
          onToggleSupplier={(id) => setExpandedSupplier((value) => (value === id ? undefined : id))}
          onOpen={(row) => void open(row)}
          canEdit={canEdit}
          refresh={refresh}
          onEditSupplier={(record) => {
            setSelected(record);
            setEditorId((value) => value + 1);
          }}
          onSupplierSaved={() => setRefresh((value) => value + 1)}
        />
      )}
      {page && (
        <ResourcePager
          resource={resource}
          page={page}
          pageNumber={pageNumber}
          pageSize={pageSize}
          loading={loading}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageNumber(1);
          }}
          onPrevious={() => setPageNumber((value) => value - 1)}
          onNext={() => setPageNumber((value) => value + 1)}
        />
      )}
    </>
  );

  // Subtitle under the result heading.
  const resultSummary = accessDirectory
    ? (statuses.find(([value]) => value === filter)?.[1] ?? "Tất cả trạng thái tài khoản")
    : customerDirectory
      ? search
        ? `Kết quả tìm kiếm: ${search}`
        : "Thông tin liên hệ và tài khoản thương lái"
      : [
          filter === "-" ? "Chưa chọn trạng thái" : filter ? "Theo trạng thái đã chọn" : "Tất cả trạng thái",
          category === "-" ? "Chưa chọn nhóm" : category ? "Theo nhóm đã chọn" : "Tất cả nhóm",
        ].join(" · ");

  return (
    <section>
      <ManagementHeading title={definition.title} description={presentation.description} icon={presentation.icon}>
        {canCreate && (
          <Button
            className="w-auto"
            disabled={definition.zoneRequired && !zoneId}
            onClick={() => {
              setSelected(null);
              setEditorId((value) => value + 1);
            }}
          >
            {actions?.create ?? "Thêm mới"}
          </Button>
        )}
      </ManagementHeading>
      {resource === "roles" && <StaffRoleSummary />}
      {resource === "zones" && <GlobalZoneMap />}
      {!usesFilterRail && resource !== "customers" && resource !== "roles" && filters}
      {usesFilterRail ? (
        <FilterWorkspace
          label={accessDirectory ? "Lọc tài khoản" : "Bộ lọc danh sách"}
          filters={filters}
          reset={
            <button
              type="button"
              className={catalogStyles.reset}
              disabled={!search && !filter && !category}
              onClick={() => {
                setSearch("");
                setFilter("");
                setCategory("");
                setPageNumber(1);
              }}
            >
              Đặt lại
            </button>
          }
        >
          <div className={catalogStyles.results} aria-busy={loading}>
            {searchControl}

            <div className={catalogStyles.resultHeading}>
              <div>
                <h2>{resultTitleFor(resource)}</h2>
                <p>{resultSummary}</p>
              </div>
              <span>{loading ? "Đang tải…" : page ? `${page.total} kết quả` : "Chưa tải được dữ liệu"}</span>
            </div>
            {results}
          </div>
        </FilterWorkspace>
      ) : (
        results
      )}
      {selected !== undefined && (
        <ResourceEditor
          key={editorId}
          resource={resource}
          record={selected}
          canEdit={canEdit}
          zones={zones}
          zoneId={zoneId}
          onClose={() => {
            openGeneration.current++;
            setSelected(undefined);
          }}
          onSaved={(saved) => {
            setSelected(saved);
            setEditorId((value) => value + 1);
            setRefresh((value) => value + 1);
            setNotice("Đã lưu dữ liệu.");
          }}
        />
      )}
    </section>
  );
}
