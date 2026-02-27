'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '../lib/supabase'
import { Play, BookOpen, LogIn, LogOut, User } from 'lucide-react'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` }
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
      style={{ background: 'rgba(15,17,23,0.85)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Play size={14} className="text-white fill-white" />
          </div>
          <span className="text-white">Media<span className="text-indigo-400">OnDemand</span></span>
        </a>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="/?type=video" className="hover:text-white transition-colors flex items-center gap-1.5">
            <Play size={14} /> Vidéos
          </a>
          <a href="/?type=ebook" className="hover:text-white transition-colors flex items-center gap-1.5">
            <BookOpen size={14} /> Ebooks
          </a>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="avatar"
                    className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center">
                    <User size={13} className="text-white" />
                  </div>
                )}
                <span className="hidden md:block">{user.user_metadata?.full_name?.split(' ')[0]}</span>
              </div>
              <button onClick={signOut}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                <LogOut size={13} /> Déconnexion
              </button>
            </div>
          ) : (
            <button onClick={signInWithGoogle}
              className="flex items-center gap-2 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors">
              <LogIn size={14} />
              Connexion Google
            </button>
          )}
        </div>

      </div>
    </nav>
  )
}
