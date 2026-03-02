"use client"
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'

function page() {
  const router = useRouter()
  useEffect(()=>{
    router.push("/admin/analytics")
  },[])
  return (
    <div></div>
  )
}

export default page