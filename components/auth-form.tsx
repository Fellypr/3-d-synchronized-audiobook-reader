'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')

    try {
      const result = mode === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name })

      if (result.error) {
        setError('Não foi possível concluir. Verifique seus dados e tente novamente.')
        return
      }

      window.location.assign('/')
    } catch (error) {
      console.error('[v0] Authentication request failed:', error)
      setError('Não foi possível conectar ao serviço de autenticação. Tente novamente.')
    } finally {
      setPending(false)
    }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#e8e4db] p-5"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-[#faf9f6] p-8 text-[#292723] shadow-xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#887f73]">Synchronized Reader</p><h1 className="mt-3 font-serif text-3xl">{mode === 'sign-in' ? 'Entrar na sua biblioteca' : 'Criar sua conta'}</h1><p className="mt-2 text-sm text-[#756e65]">Seu progresso fica sincronizado por livro em todos os seus acessos.</p><div className="mt-6 grid gap-4">{mode === 'sign-up' && <label htmlFor="name" className="grid gap-2 text-sm font-semibold text-[#403b35]">Nome<input id="name" name="name" required autoComplete="name" placeholder="Digite seu nome" value={name} onChange={e => setName(e.target.value)} className="rounded-xl border border-black/15 bg-white p-3 font-normal text-[#292723] outline-none placeholder:text-[#918a81] focus:border-[#635b51] focus:ring-2 focus:ring-[#635b51]/20" /></label>}<label htmlFor="email" className="grid gap-2 text-sm font-semibold text-[#403b35]">E-mail<input id="email" name="email" required type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl border border-black/15 bg-white p-3 font-normal text-[#292723] outline-none placeholder:text-[#918a81] focus:border-[#635b51] focus:ring-2 focus:ring-[#635b51]/20" /></label><label htmlFor="password" className="grid gap-2 text-sm font-semibold text-[#403b35]">Senha<input id="password" name="password" required minLength={8} type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} placeholder="Mínimo de 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl border border-black/15 bg-white p-3 font-normal text-[#292723] outline-none placeholder:text-[#918a81] focus:border-[#635b51] focus:ring-2 focus:ring-[#635b51]/20" /></label></div>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}<button disabled={pending} className="mt-6 w-full rounded-xl bg-[#20201e] px-4 py-3 font-medium text-white disabled:opacity-50">{pending ? 'Aguarde…' : mode === 'sign-in' ? 'Entrar' : 'Cadastrar'}</button><button type="button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} className="mt-4 w-full text-sm text-[#635b51] underline">{mode === 'sign-in' ? 'Ainda não tenho uma conta' : 'Já tenho uma conta'}</button></form></main>
}
