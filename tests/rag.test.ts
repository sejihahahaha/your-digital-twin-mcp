import { describe, it, expect } from 'vitest'
import { buildContextFromProfile } from '../lib/rag'

describe('buildContextFromProfile', () => {
  it('creates chunks for personal, experience and skills', () => {
    const profile = {
      personal: { name: 'Alex', title: 'Engineer', summary: 'Experienced' },
      experience: [
        { company: 'Co', title: 'Dev', duration: '2023', achievements_star: [{ situation: 's', task: 't', action: 'a', result: 'r' }] }
      ],
      skills: { technical: { Python: { years: 3 } }, soft_skills: ['Team'] },
      projects_portfolio: [{ name: 'P', description: 'd', technologies: ['t'], impact: 'i' }]
    }

    const chunks = buildContextFromProfile(profile)
    expect(chunks.length).toBeGreaterThanOrEqual(3)
    expect(chunks.find(c => c.id === 'personal')).toBeTruthy()
    expect(chunks.find(c => c.id?.startsWith('exp_'))).toBeTruthy()
  })
})
