"use client";
import { useCallback, useMemo } from "react";
import type { PersonOption } from "@/components/ui/management-screen/person-picker";
import { listCollectors, listTypes } from "@/features/cash-book/repository";
import { useRemote } from "@/features/operations/ui";
import { productRepository } from "@/features/products/repository";
import { endOfDayChannels, endOfDayFunds, endOfDayPartyKinds, endOfDayPaymentMethods, endOfDayPaymentTerms, endOfDaySources, type EndOfDayConcern } from "./end-of-day-contracts";
import { CHANNEL_LABEL, FUND_LABEL, PARTY_KIND_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_TERM_LABEL, SOURCE_LABEL, type EndOfDayFilters } from "./end-of-day-filters-model";
import { MultiSelectFilter, PeopleFilter, TogglePills, type MultiOption } from "./end-of-day-multi-filters";
import { useCustomerOptions, useProductOptions } from "./report-entity-filters";

const labelled = (values: readonly string[], labels: Record<string, string>) => values.map((value) => [value, labels[value] ?? value] as const);

/** Người có thể chọn làm người tạo / người nhận đặt (danh sách thu tiền của Sổ quỹ); dùng chung cho mọi mối quan tâm. */
export function usePeopleOptions() {
  const remote = useRemote(useCallback((signal: AbortSignal) => listCollectors(signal), []));
  return { people: (remote.data ?? []) as PersonOption[], loading: remote.loading, error: remote.error, reload: remote.reload };
}
type People = ReturnType<typeof usePeopleOptions>;
type Props = Readonly<{ filters: EndOfDayFilters; people: People; onChange(patch: Partial<EndOfDayFilters>): void }>;

function SalesFields({ filters, people, onChange }: Props) {
  const customers = useCustomerOptions();
  return <>
    <MultiSelectFilter legend="Khách hàng" allLabel="Tất cả khách hàng" selected={filters.customerIds} options={customers.options} source={customers} onChange={(customerIds) => onChange({ customerIds })} />
    <PeopleFilter legend="Nhân viên nhận đặt" people={people.people} selected={filters.receivedBy} source={people} onChange={(receivedBy) => onChange({ receivedBy })} />
    <PeopleFilter legend="Người tạo" people={people.people} selected={filters.createdBy} source={people} onChange={(createdBy) => onChange({ createdBy })} />
    <TogglePills legend="Phương thức thanh toán" options={labelled(endOfDayPaymentMethods, PAYMENT_METHOD_LABEL)} selected={filters.paymentMethods} onChange={(paymentMethods) => onChange({ paymentMethods })} />
    <TogglePills legend="Kênh bán" options={labelled(endOfDayChannels, CHANNEL_LABEL)} selected={filters.channels} onChange={(channels) => onChange({ channels })} />
    <TogglePills legend="Hình thức thanh toán" options={labelled(endOfDayPaymentTerms, PAYMENT_TERM_LABEL)} selected={filters.paymentTerms} onChange={(paymentTerms) => onChange({ paymentTerms })} />
  </>;
}

function MoneyFields({ filters, people, onChange }: Props) {
  const remote = useRemote(useCallback((signal: AbortSignal) => listTypes(undefined, signal), []));
  const types = useMemo<MultiOption[]>(() => (remote.data ?? []).map((type) => ({ id: type.id, label: `${type.name} (${type.direction === "Receipt" ? "Thu" : "Chi"})` })).sort((a, b) => a.label.localeCompare(b.label, "vi")), [remote.data]);
  return <>
    <TogglePills legend="Quỹ" options={labelled(endOfDayFunds, FUND_LABEL)} selected={filters.funds} onChange={(funds) => onChange({ funds })} />
    <TogglePills legend="Nguồn" options={labelled(endOfDaySources, SOURCE_LABEL)} selected={filters.sources} onChange={(sources) => onChange({ sources })} />
    <MultiSelectFilter legend="Loại thu chi" allLabel="Tất cả loại" selected={filters.typeIds} options={types} source={remote} onChange={(typeIds) => onChange({ typeIds })} />
    <TogglePills legend="Đối tượng" options={labelled(endOfDayPartyKinds, PARTY_KIND_LABEL)} selected={filters.partyKinds} onChange={(partyKinds) => onChange({ partyKinds })} />
    <PeopleFilter legend="Người tạo" people={people.people} selected={filters.createdBy} source={people} onChange={(createdBy) => onChange({ createdBy })} />
  </>;
}

function GoodsFields({ filters, people, onChange }: Props) {
  const products = useProductOptions(), customers = useCustomerOptions();
  const groups = useRemote(useCallback((signal: AbortSignal) => productRepository.groups(signal), []));
  const categories = useMemo<MultiOption[]>(() => (groups.data ?? []).map((group) => ({ id: group.id, label: group.name })).sort((a, b) => a.label.localeCompare(b.label, "vi")), [groups.data]);
  return <>
    <MultiSelectFilter legend="Sản phẩm" allLabel="Tất cả sản phẩm" selected={filters.productIds} options={products.options} source={products} onChange={(productIds) => onChange({ productIds })} />
    <MultiSelectFilter legend="Nhóm hàng" allLabel="Tất cả nhóm hàng" selected={filters.categoryIds} options={categories} source={groups} onChange={(categoryIds) => onChange({ categoryIds })} />
    <MultiSelectFilter legend="Khách hàng" allLabel="Tất cả khách hàng" selected={filters.customerIds} options={customers.options} source={customers} onChange={(customerIds) => onChange({ customerIds })} />
    <PeopleFilter legend="Người tạo" people={people.people} selected={filters.createdBy} source={people} onChange={(createdBy) => onChange({ createdBy })} />
  </>;
}

/** Tiêu chí riêng của mối quan tâm đang chọn (chỉ phần của mối quan tâm đó được dựng nên chỉ tải đúng các danh sách cần dùng). */
export function ConcernFields({ concern, ...props }: Props & Readonly<{ concern: EndOfDayConcern }>) {
  if (concern === "sales") return <SalesFields {...props} />;
  if (concern === "money") return <MoneyFields {...props} />;
  if (concern === "goods") return <GoodsFields {...props} />;
  return <PeopleFilter legend="Người tạo" people={props.people.people} selected={props.filters.createdBy} source={props.people} onChange={(createdBy) => props.onChange({ createdBy })} />;
}
