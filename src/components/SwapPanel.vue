<template>
  <div class="bg-gray-900 rounded-2xl p-6 border border-white/10 w-full">
    <!-- Header + Slippage -->
    <div class="flex items-start justify-between mb-6 gap-4">
      <h2 class="text-lg font-semibold text-white">Swap</h2>
      <div class="flex items-center gap-2 flex-wrap justify-end">
        <span class="text-xs text-gray-400 shrink-0">Slippage</span>
        <div class="flex items-center gap-1">
          <button
            v-for="p in SLIPPAGE_PRESETS"
            :key="p"
            class="px-2 py-1 rounded-lg text-xs font-medium transition-colors"
            :class="slippage === p ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'"
            @click="slippage = p"
          >
            {{ p }}%
          </button>
          <input
            v-model.number="slippage"
            type="number"
            min="0.01"
            max="50"
            step="0.1"
            class="w-14 px-2 py-1 rounded-lg bg-gray-800 text-white text-xs text-center outline-none focus:ring-1 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>
    </div>

    <!-- From token -->
    <div class="bg-gray-800 rounded-xl p-4">
      <p class="text-xs text-gray-500 mb-3">From</p>
      <div class="flex items-center gap-3">
        <!-- Token selector -->
        <div class="relative shrink-0" ref="fromDropdownRef">
          <button
            class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 transition-colors"
            @click="fromDropdownOpen = !fromDropdownOpen"
          >
            <div
              class="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              :class="ICON_COLOR[fromToken.symbol] ?? 'bg-gray-600'"
            >
              {{ fromToken.symbol.slice(0, 2) }}
            </div>
            <span class="text-sm font-semibold text-white">{{ fromToken.symbol }}</span>
            <svg class="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <Transition
            enter-active-class="transition-all duration-150"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-100"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="fromDropdownOpen"
              class="absolute left-0 mt-1 w-44 rounded-xl bg-gray-900 border border-white/10 shadow-xl overflow-hidden z-50"
            >
              <button
                v-for="token in selectableFromTokens"
                :key="token.address"
                class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors text-left"
                @click="selectFromToken(token)"
              >
                <div
                  class="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  :class="ICON_COLOR[token.symbol] ?? 'bg-gray-600'"
                >
                  {{ token.symbol.slice(0, 2) }}
                </div>
                <div>
                  <p class="text-white font-medium leading-tight">{{ token.symbol }}</p>
                  <p class="text-gray-500 text-xs">{{ token.name }}</p>
                </div>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Amount input -->
        <input
          v-model="fromAmount"
          type="number"
          min="0"
          placeholder="0.0"
          class="flex-1 min-w-0 bg-transparent text-right text-2xl font-semibold text-white placeholder-gray-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>

    <!-- Flip button -->
    <div class="flex justify-center my-[-1px] relative z-10">
      <button
        class="p-2 rounded-full bg-gray-800 border-4 border-gray-900 hover:bg-gray-700 active:scale-90 transition-all"
        aria-label="Flip tokens"
        @click="flipTokens"
      >
        <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </button>
    </div>

    <!-- To token -->
    <div class="bg-gray-800 rounded-xl p-4 mb-5">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs text-gray-500">To</p>
        <span v-if="loading" class="text-xs text-gray-500 flex items-center gap-1.5">
          <svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Fetching quote…
        </span>
      </div>
      <div class="flex items-center gap-3">
        <!-- Token selector -->
        <div class="relative shrink-0" ref="toDropdownRef">
          <button
            class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 transition-colors"
            @click="toDropdownOpen = !toDropdownOpen"
          >
            <div
              class="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              :class="ICON_COLOR[toToken.symbol] ?? 'bg-gray-600'"
            >
              {{ toToken.symbol.slice(0, 2) }}
            </div>
            <span class="text-sm font-semibold text-white">{{ toToken.symbol }}</span>
            <svg class="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <Transition
            enter-active-class="transition-all duration-150"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-100"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="toDropdownOpen"
              class="absolute left-0 mt-1 w-44 rounded-xl bg-gray-900 border border-white/10 shadow-xl overflow-hidden z-50"
            >
              <button
                v-for="token in selectableToTokens"
                :key="token.address"
                class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors text-left"
                @click="selectToToken(token)"
              >
                <div
                  class="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  :class="ICON_COLOR[token.symbol] ?? 'bg-gray-600'"
                >
                  {{ token.symbol.slice(0, 2) }}
                </div>
                <div>
                  <p class="text-white font-medium leading-tight">{{ token.symbol }}</p>
                  <p class="text-gray-500 text-xs">{{ token.name }}</p>
                </div>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Output amount -->
        <div class="flex-1 min-w-0 text-right">
          <div v-if="loading" class="h-8 w-28 ml-auto rounded-lg bg-gray-700 animate-pulse" />
          <span
            v-else
            class="text-2xl font-semibold"
            :class="toAmount ? 'text-white' : 'text-gray-600'"
          >
            {{ toAmount || '0.0' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Quote info section -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="quote && !loading" class="bg-gray-800/50 rounded-xl px-4 py-3 mb-4 flex flex-col gap-2">
        <!-- Exchange rate -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">Rate</span>
          <span class="text-white">
            1 {{ fromToken.symbol }} ≈ {{ exchangeRate !== null ? fmtNum(exchangeRate, 6) : '—' }} {{ toToken.symbol }}
          </span>
        </div>

        <!-- Price impact -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">Price Impact</span>
          <span :class="priceImpactColor" class="flex items-center gap-1 font-medium">
            <svg
              v-if="priceImpact !== null && priceImpact >= 2"
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {{ priceImpact !== null ? fmtNum(priceImpact, 2) + '%' : '—' }}
          </span>
        </div>

        <!-- Estimated gas fee -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">Est. Gas</span>
          <span class="text-white">{{ gasFeeUsd !== null ? '$' + fmtNum(gasFeeUsd, 4) : '—' }}</span>
        </div>
      </div>
    </Transition>

    <!-- Transaction submitted banner -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 scale-98"
      enter-to-class="opacity-100 scale-100"
    >
      <div
        v-if="txHash"
        class="bg-indigo-900/30 border border-indigo-500/30 rounded-xl px-4 py-3 mb-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <span class="text-sm text-indigo-300 font-medium">Transaction submitted</span>
          </div>
          <a
            :href="etherscanUrl!"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-indigo-400 hover:text-indigo-200 font-mono transition-colors shrink-0"
          >
            {{ txHash.slice(0, 10) }}…{{ txHash.slice(-6) }} ↗
          </a>
        </div>
      </div>
    </Transition>

    <!-- Swap button -->
    <button
      :disabled="!canSwap"
      class="w-full py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
      :class="canSwap
        ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white'
        : 'bg-gray-800 text-gray-500 cursor-not-allowed'"
      @click="handleSwap"
    >
      <svg
        v-if="loading || txPending"
        class="h-4 w-4 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>

      <span v-if="!isConnected">Connect Wallet to Swap</span>
      <span v-else-if="txPending">Confirming…</span>
      <span v-else-if="loading">Fetching Quote…</span>
      <span v-else-if="!fromAmount || !quote">Enter an amount</span>
      <span v-else>Swap {{ fromToken.symbol }} → {{ toToken.symbol }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { BrowserProvider } from 'ethers'
import { useSwap } from '@/composables/useSwap'
import { useTokenPrice } from '@/composables/useTokenPrice'
import { useWalletStore } from '@/stores/walletStore'
import { useToast } from '@/composables/useToast'

interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
}

const TOKENS: Token[] = [
  { symbol: 'ETH',  name: 'Ethereum',     address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin',      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6  },
  { symbol: 'USDT', name: 'Tether USD',    address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6  },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', decimals: 18 },
]

const ICON_COLOR: Record<string, string> = {
  ETH:  'bg-indigo-500',
  USDC: 'bg-blue-500',
  USDT: 'bg-emerald-600',
  WETH: 'bg-violet-500',
}

const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0]

const fromToken = ref<Token>(TOKENS[0])
const toToken   = ref<Token>(TOKENS[1])
const fromAmount = ref('')
const slippage   = ref(0.5)
const txHash     = ref<string | null>(null)
const txPending  = ref(false)
const gasPriceGwei = ref<number | null>(null)
const fromDropdownOpen = ref(false)
const toDropdownOpen   = ref(false)
const fromDropdownRef  = ref<HTMLElement | null>(null)
const toDropdownRef    = ref<HTMLElement | null>(null)

const { quote, estimatedGas, priceImpact, loading, getQuote, executeSwap } = useSwap()
const { prices } = useTokenPrice()
const walletStore = useWalletStore()
const { isConnected, chainId } = storeToRefs(walletStore)
const { show } = useToast()

const selectableFromTokens = computed(() => TOKENS.filter(t => t.address !== fromToken.value.address))
const selectableToTokens   = computed(() => TOKENS.filter(t => t.address !== toToken.value.address))

const toAmount = computed(() => {
  if (!quote.value) return ''
  const raw = Number(quote.value.toTokenAmount) / 10 ** quote.value.toToken.decimals
  return raw.toLocaleString('en-US', { maximumFractionDigits: 6 })
})

const exchangeRate = computed<number | null>(() => {
  if (!quote.value || !fromAmount.value) return null
  const from = parseFloat(fromAmount.value)
  if (from <= 0) return null
  const to = Number(quote.value.toTokenAmount) / 10 ** quote.value.toToken.decimals
  return to / from
})

const gasFeeUsd = computed<number | null>(() => {
  if (!estimatedGas.value || !gasPriceGwei.value) return null
  const ethCost = estimatedGas.value * gasPriceGwei.value * 1e-9
  return ethCost * prices.value['ethereum']
})

const priceImpactColor = computed(() => {
  if (priceImpact.value === null) return 'text-gray-400'
  if (priceImpact.value >= 5) return 'text-red-400'
  if (priceImpact.value >= 2) return 'text-amber-400'
  return 'text-emerald-400'
})

const etherscanUrl = computed(() => {
  if (!txHash.value) return null
  const subdomain = chainId.value === 1 ? '' : 'sepolia.'
  return `https://${subdomain}etherscan.io/tx/${txHash.value}`
})

const canSwap = computed(
  () => isConnected.value && !!quote.value && !loading.value && !txPending.value
        && parseFloat(fromAmount.value) > 0,
)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function scheduleQuote() {
  if (debounceTimer) clearTimeout(debounceTimer)
  quote.value = null
  gasPriceGwei.value = null
  const amount = parseFloat(fromAmount.value)
  if (!amount || amount <= 0 || !isConnected.value) return
  debounceTimer = setTimeout(fetchQuote, 600)
}

async function fetchQuote() {
  const amount = parseFloat(fromAmount.value)
  if (!amount || amount <= 0) return
  const raw = BigInt(Math.floor(amount * 10 ** fromToken.value.decimals)).toString()
  try {
    await getQuote(fromToken.value.address, toToken.value.address, raw, slippage.value)
    await fetchGasPrice()
  } catch (err) {
    show(err instanceof Error ? err.message : String(err), 'error')
  }
}

async function fetchGasPrice() {
  try {
    const provider = new BrowserProvider((window as unknown as { ethereum: unknown }).ethereum)
    const feeData = await provider.getFeeData()
    gasPriceGwei.value = feeData.gasPrice !== null ? Number(feeData.gasPrice) / 1e9 : null
  } catch {
    gasPriceGwei.value = null
  }
}

function flipTokens() {
  const tmp = fromToken.value
  fromToken.value = toToken.value
  toToken.value = tmp
  fromAmount.value = ''
  quote.value = null
  gasPriceGwei.value = null
}

function selectFromToken(token: Token) {
  if (token.address === toToken.value.address) {
    toToken.value = fromToken.value
  }
  fromToken.value = token
  fromDropdownOpen.value = false
  quote.value = null
}

function selectToToken(token: Token) {
  if (token.address === fromToken.value.address) {
    fromToken.value = toToken.value
  }
  toToken.value = token
  toDropdownOpen.value = false
  quote.value = null
  scheduleQuote()
}

async function handleSwap() {
  if (!canSwap.value) return
  txPending.value = true
  txHash.value = null
  try {
    const raw = BigInt(Math.floor(parseFloat(fromAmount.value) * 10 ** fromToken.value.decimals)).toString()
    const hash = await executeSwap(fromToken.value.address, toToken.value.address, raw, slippage.value)
    txHash.value = hash
    show('Swap submitted!', 'success')
  } catch (err) {
    show(err instanceof Error ? err.message : String(err), 'error')
  } finally {
    txPending.value = false
  }
}

function fmtNum(n: number | null, decimals = 2): string {
  if (n === null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

function onDocClick(e: MouseEvent) {
  if (fromDropdownRef.value && !fromDropdownRef.value.contains(e.target as Node)) {
    fromDropdownOpen.value = false
  }
  if (toDropdownRef.value && !toDropdownRef.value.contains(e.target as Node)) {
    toDropdownOpen.value = false
  }
}

watch([fromAmount, () => fromToken.value.address, () => toToken.value.address, slippage], scheduleQuote)

onMounted(() => document.addEventListener('click', onDocClick, true))
onUnmounted(() => {
  document.removeEventListener('click', onDocClick, true)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
