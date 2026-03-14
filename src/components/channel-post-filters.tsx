"use client";

import type { Route } from "next";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { postStatusFilterOptions } from "@/lib/post-status";
import { ui } from "@/lib/ui-classes";

const SEARCH_DEBOUNCE_MS = 500;

function buildUrl(pathname: string, nextQuery: string, nextStatus: string) {
  const nextParams = new URLSearchParams();

  if (nextQuery) {
    nextParams.set("q", nextQuery);
  }

  if (nextStatus) {
    nextParams.set("status", nextStatus);
  }

  return (nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname) as Route;
}

type ChannelPostFiltersProps = Readonly<{
  initialQuery: string;
  initialStatus: string;
}>;

export function ChannelPostFilters({
  initialQuery,
  initialStatus,
}: ChannelPostFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (query === initialQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextUrl = buildUrl(pathname, query, status);
      const currentUrl = buildUrl(pathname, initialQuery, initialStatus);

      if (nextUrl === currentUrl) {
        return;
      }

      startTransition(() => {
        router.replace(nextUrl, { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [initialQuery, initialStatus, pathname, query, router, status]);

  const handleStatusChange = (nextStatus: string) => {
    setStatus(nextStatus);
    const nextUrl = buildUrl(pathname, query, nextStatus);
    const currentUrl = buildUrl(pathname, initialQuery, initialStatus);

    if (nextUrl === currentUrl) {
      return;
    }

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  };

  const clearFilters = () => {
    setQuery("");
    setStatus("");

    startTransition(() => {
      router.replace(pathname as Route, { scroll: false });
    });
  };

  return (
    <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
      <input
        className={ui.form.input}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="投稿タイトルや本文を検索"
        type="search"
        value={query}
      />
      <select
        className={ui.form.select}
        onChange={(event) => handleStatusChange(event.target.value)}
        value={status}
      >
        {postStatusFilterOptions.map((option) => (
          <option key={option.value || "ALL"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        className={ui.button.secondary}
        disabled={isPending || (!query && !status)}
        onClick={clearFilters}
        type="button"
      >
        クリア
      </button>
    </div>
  );
}
