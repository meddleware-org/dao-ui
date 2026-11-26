// What a person reads when a read fails (src/availability.ts): plain words, never the error's own text, which can quote an address the page asked
// (D146); and the technical cause goes to the console once.
import { describe, expect, it, vi } from 'vitest'
import { NotDeployedError, plainFailure, UNREADABLE } from '../src/availability.js'

describe('plainFailure', () => {
  // A fault the person cannot act on gets the plain sentence, whatever the error said.
  it('never repeats the error text, which can quote an address the page asked', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const words = plainFailure('the platform settings', new Error('connect ECONNREFUSED https://node.example/rpc'))
    expect(words).toBe(UNREADABLE)
    expect(words).not.toMatch(/node\.example|ECONNREFUSED/)
    log.mockRestore()
  })

  // The developer still gets the cause, once per distinct cause, with the app and the thing being read.
  it('writes the technical cause to the console once', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    plainFailure('the treasury balance', new Error('gRPC 14 unavailable'))
    plainFailure('the treasury balance', new Error('gRPC 14 unavailable'))
    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith('dao-ui: reading the treasury balance failed (gRPC 14 unavailable)')
    log.mockRestore()
  })

  // A thrown value that is not an Error is still turned into text for the console.
  it('copes with a thrown value that is not an Error', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(plainFailure('the activity', 'boom')).toBe(UNREADABLE)
    expect(log).toHaveBeenCalledWith('dao-ui: reading the activity failed (boom)')
    log.mockRestore()
  })

  // No recorded deployment is not a fault: the console is not offered there, and nothing is logged.
  it('says the console is not available on a network with no recorded deployment, and logs nothing', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(plainFailure('the platform settings', new NotDeployedError('mainnet'))).toBe('The DAO console is not available on mainnet.')
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
