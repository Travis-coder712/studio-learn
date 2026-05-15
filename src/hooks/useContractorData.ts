import { useState, useEffect, useMemo } from 'react'
import type { ContractorIndex, ContractorProfile } from '../lib/types'
import { fetchContractorIndex } from '../lib/dataService'

export function useContractorIndex() {
  const [data, setData] = useState<ContractorIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchContractorIndex()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useContractor(slug: string | undefined) {
  const { data, loading, error } = useContractorIndex()

  const contractor = useMemo<ContractorProfile | null>(() => {
    if (!data || !slug) return null
    return data.contractors.find((c) => c.slug === slug) ?? null
  }, [data, slug])

  return { contractor, loading, error }
}
