import zip from 'lodash.zipobject'

import httpMethods from 'http-client'
import openWebSocket from 'open-websocket'

const BASE = 'wss://stream.binance.com:9443/ws'
const FUTURES = 'wss://fstream.binance.com/ws'

const depth = (payload, cb, variator = '') => {
	const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
		const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@depth`)
		w.onmessage = msg => {
			const {
				e: eventType,
				E: eventTime,
				s: symbol,
				U: firstUpdateId,
				u: finalUpdateId,
				b: bidDepth,
				a: askDepth,
			} = JSON.parse(msg.data)

			cb({
				eventType,
				eventTime,
				symbol,
				firstUpdateId,
				finalUpdateId,
				bidDepth: bidDepth.map(b => zip(['price', 'quantity'], b)),
				askDepth: askDepth.map(a => zip(['price', 'quantity'], a)),
			})
		}

		return w
	})

	return options =>
		cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const futuresDepth = (payload, cb) => depth(payload, cb, 'futures')

const partialDepth = (payload, cb, variator = '') => {
	const cache = (Array.isArray(payload) ? payload : [payload]).map(({ symbol, level }) => {
		const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@depth${level}`)
		w.onmessage = msg => {
			const { lastUpdateId, bids, asks } = JSON.parse(msg.data)
			cb({
				symbol,
				level,
				lastUpdateId,
				bids: bids.map(b => zip(['price', 'quantity'], b)),
				asks: asks.map(a => zip(['price', 'quantity'], a)),
			})
		}

		return w
	})

	return options =>
		cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const futuresPartialDepth = (payload, cb) => partialDepth(payload, cb, 'futures')

const candles = (payload, interval, cb, variator = '') => {
	if (!interval || !cb) {
		throw new Error('Please pass a symbol, interval and callback.')
	}

	const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
		const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@kline_${interval}`)
		w.onmessage = msg => {
			const { e: eventType, E: eventTime, s: symbol, k: tick } = JSON.parse(msg.data)
			const {
				t: startTime,
				T: closeTime,
				f: firstTradeId,
				L: lastTradeId,
				o: open,
				h: high,
				l: low,
				c: close,
				v: volume,
				n: trades,
				i: interval,
				x: isFinal,
				q: quoteVolume,
				V: buyVolume,
				Q: quoteBuyVolume,
			} = tick

			cb({
				eventType,
				eventTime,
				symbol,
				startTime,
				closeTime,
				firstTradeId,
				lastTradeId,
				open,
				high,
				low,
				close,
				volume,
				trades,
				interval,
				isFinal,
				quoteVolume,
				buyVolume,
				quoteBuyVolume,
			})
		}

		return w
	})

	return options =>
		cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const futuresCandles = (payload, interval, cb) => candles(payload, interval, cb, 'futures')

const tickerTransform = m => ({
	eventType: m.e,
	eventTime: m.E,
	symbol: m.s,
	priceChange: m.p,
	priceChangePercent: m.P,
	weightedAvg: m.w,
	prevDayClose: m.x,
	curDayClose: m.c,
	closeTradeQuantity: m.Q,
	bestBid: m.b,
	bestBidQnt: m.B,
	bestAsk: m.a,
	bestAskQnt: m.A,
	open: m.o,
	high: m.h,
	low: m.l,
	volume: m.v,
	volumeQuote: m.q,
	openTime: m.O,
	closeTime: m.C,
	firstTradeId: m.F,
	lastTradeId: m.L,
	totalTrades: m.n,
})

const ticker = (payload, cb, variator = '') => {
	const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
		const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@ticker`)

		w.onmessage = msg => {
			cb(tickerTransform(JSON.parse(msg.data)))
		}

		return w
	})

	return options =>
		cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const futuresTicker = (payload, cb) => ticker(payload, cb, 'futures')

const allTickers = (cb, variator = '') => {
	const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/!ticker@arr`)

	w.onmessage = msg => {
		const arr = JSON.parse(msg.data)
		cb(arr.map(m => tickerTransform(m)))
	}

	return options => w.close(1000, 'Close handle was called', { keepClosed: true, ...options })
}

const futuresAllTicker = (cb) => allTickers(cb, 'futures')

const aggTradesInternal = (payload, cb, variator = '') => {
	const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
		const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@aggTrade`)

		w.onmessage = msg => {
			const {
				e: eventType,
				E: eventTime,
				T: timestamp,
				s: symbol,
				p: price,
				q: quantity,
				m: isBuyerMaker,
				M: wasBestPrice,
				a: aggId,
				f: firstId,
				l: lastId,
			} = JSON.parse(msg.data)

			cb({
				eventType,
				eventTime,
				aggId,
				price,
				quantity,
				firstId,
				lastId,
				timestamp,
				symbol,
				isBuyerMaker,
				wasBestPrice,
			})
		}

		return w
	})

	return options =>
		cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const tradesInternal = (payload, cb, variator = '') => {
	const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
		const w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${symbol.toLowerCase()}@trade`)
		w.onmessage = msg => {
			const {
				e: eventType,
				E: eventTime,
				T: tradeTime,
				s: symbol,
				p: price,
				q: quantity,
				m: isBuyerMaker,
				M: maker,
				t: tradeId,
				a: sellerOrderId,
				b: buyerOrderId,
			} = JSON.parse(msg.data)

			cb({
				eventType,
				eventTime,
				tradeTime,
				symbol,
				price,
				quantity,
				isBuyerMaker,
				maker,
				tradeId,
				buyerOrderId,
				sellerOrderId,
			})
		}

		return w
	})

	return options =>
		cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const aggTrades = (payload, cb) => aggTradesInternal(payload, cb)

const futuresAggTrades = (payload, cb) => aggTradesInternal(payload, cb, 'futures')

const trades = (payload, cb) => tradesInternal(payload, cb)

const futuresTrades = (payload, cb) => tradesInternal(payload, cb, 'futures')

const markPriceTransform = m => ({
	eventType: m.e,
	eventTime: m.E,
	symbol: m.s,
	price: m.p,
	indexPrice: m.i,
	fundingRate: m.r,
	nextFundingTime: m.T,
})

const futuresMarkPrice = (payload, cb) => {
	const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
		const w = openWebSocket(`${FUTURES}/${symbol.toLowerCase()}@markPrice@1s`)
		w.onmessage = msg => {
			cb(markPriceTransform(JSON.parse(msg.data)))
		}

		return w
	})

	return options =>
		cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const futuresAllMarkPrice = (cb) => {
	const w = openWebSocket(`${FUTURES}/@markPrice@arr@1s`)

	w.onmessage = msg => {
		const arr = JSON.parse(msg.data)
		cb(arr.map(m => markPriceTransform(m)))
	}

	return options =>
		cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const bookTickerTransform = m => ({
	updateId: m.u,
	eventTime: m.E,
	time: m.T,
	symbol: m.s,
	bidPrice: m.b,
	bidQuantity: m.B,
	askPrice: m.a,
	askQuantity: m.A,
})

const futuresBookTicker = (payload, cb) => {
	const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
		const w = openWebSocket(`${FUTURES}/${symbol.toLowerCase()}@bookTicker`)
		w.onmessage = msg => {
			cb(bookTickerTransform(JSON.parse(msg.data)))
		}

		return w
	})

	return options =>
		cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const forceOrderTransform = m => ({
	eventType: m.e,
	eventTime: m.E,
	symbol: m.o.s,
	side: m.o.S,
	orderType: m.o.o,
	timeInForce: m.o.f,
	origQty: m.o.q,
	price: m.o.p,
	averagePrice: m.o.ap,
	status: m.o.X,
	lastFilledQuantity: m.o.l,
	filledAccumulatedQuantity: m.o.z,
	time: m.T,
})

const futuresForceOrder = (payload, cb) => {
	const cache = (Array.isArray(payload) ? payload : [payload]).map(symbol => {
		const w = openWebSocket(`${FUTURES}/${symbol.toLowerCase()}@bookTicker`)
		w.onmessage = msg => {
			cb(forceOrderTransform(JSON.parse(msg.data)))
		}

		return w
	})

	return options =>
		cache.forEach(w => w.close(1000, 'Close handle was called', { keepClosed: true, ...options }))
}

const userTransforms = {
	// https://github.com/binance-exchange/binance-official-api-docs/blob/master/user-data-stream.md#balance-update
	balanceUpdate: m => ({
		asset: m.a,
		balanceDelta: m.d,
		clearTime: m.T,
		eventTime: m.E,
		eventType: 'balanceUpdate',
	}),
	// https://github.com/binance-exchange/binance-official-api-docs/blob/master/user-data-stream.md#account-update
	outboundAccountInfo: m => ({
		eventType: 'account',
		eventTime: m.E,
		makerCommissionRate: m.m,
		takerCommissionRate: m.t,
		buyerCommissionRate: m.b,
		sellerCommissionRate: m.s,
		canTrade: m.T,
		canWithdraw: m.W,
		canDeposit: m.D,
		lastAccountUpdate: m.u,
		balances: m.B.reduce((out, cur) => {
			out[cur.a] = { available: cur.f, locked: cur.l }
			return out
		}, {}),
	}),
	// https://github.com/binance-exchange/binance-official-api-docs/blob/master/user-data-stream.md#account-update
	outboundAccountPosition: m => ({
		balances: m.B.map(({ a, f, l }) => ({ asset: a, free: f, locked: l })),
		eventTime: m.E,
		eventType: 'outboundAccountPosition',
		lastAccountUpdate: m.u,
	}),
	// https://github.com/binance-exchange/binance-official-api-docs/blob/master/user-data-stream.md#order-update
	executionReport: m => ({
		eventType: 'executionReport',
		eventTime: m.E,
		symbol: m.s,
		newClientOrderId: m.c,
		originalClientOrderId: m.C,
		side: m.S,
		orderType: m.o,
		timeInForce: m.f,
		quantity: m.q,
		price: m.p,
		executionType: m.x,
		stopPrice: m.P,
		icebergQuantity: m.F,
		orderStatus: m.X,
		orderRejectReason: m.r,
		orderId: m.i,
		orderTime: m.T,
		lastTradeQuantity: m.l,
		totalTradeQuantity: m.z,
		priceLastTrade: m.L,
		commission: m.n,
		commissionAsset: m.N,
		tradeId: m.t,
		isOrderWorking: m.w,
		isBuyerMaker: m.m,
		creationTime: m.O,
		totalQuoteTradeQuantity: m.Z,
		orderListId: m.g,
		quoteOrderQuantity: m.Q,
		lastQuoteTransacted: m.Y,
	}),
}

export const userEventHandler = cb => msg => {
	const { e: type, ...rest } = JSON.parse(msg.data)
	cb(userTransforms[type] ? userTransforms[type](rest) : { type, ...rest })
}

const STREAM_METHODS = ['get', 'keep', 'close']

const capitalize = (str, check) => (check ? `${str[0].toUpperCase()}${str.slice(1)}` : str)

const getStreamMethods = (opts, variator = '') => {
	const methods = httpMethods(opts)

	return STREAM_METHODS.reduce(
		(acc, key) => [...acc, methods[`${variator}${capitalize(`${key}DataStream`, !!variator)}`]],
		[],
	)
}

export const keepStreamAlive = (method, listenKey) => method({ listenKey })

const user = (opts, variator) => cb => {
	const [getDataStream, keepDataStream, closeDataStream] = getStreamMethods(opts, variator)

	let currentListenKey = null
	let int = null
	let w = null

	const keepAlive = isReconnecting => {
		if (currentListenKey) {
			keepStreamAlive(keepDataStream, currentListenKey).catch(() => {
				closeStream({}, true)

				if (isReconnecting) {
					setTimeout(() => makeStream(true), 30e3)
				} else {
					makeStream(true)
				}
			})
		}
	}

	const closeStream = (options, catchErrors) => {
		if (currentListenKey) {
			clearInterval(int)

			const p = closeDataStream({ listenKey: currentListenKey })

			if (catchErrors) {
				p.catch(f => f)
			}

			w.close(1000, 'Close handle was called', { keepClosed: true, ...options })
			currentListenKey = null
		}
	}

	const makeStream = isReconnecting => {
		return getDataStream()
			.then(({ listenKey }) => {
				w = openWebSocket(`${variator === 'futures' ? FUTURES : BASE}/${listenKey}`)
				w.onmessage = msg => userEventHandler(cb)(msg)

				currentListenKey = listenKey

				int = setInterval(() => keepAlive(false), 50e3)

				keepAlive(true)

				return options => closeStream(options)
			})
			.catch(err => {
				if (isReconnecting) {
					setTimeout(() => makeStream(true), 30e3)
				} else {
					throw err
				}
			})
	}

	return makeStream(false)
}

export default opts => ({
	depth,
	futuresDepth,
	partialDepth,
	futuresPartialDepth,
	candles,
	futuresCandles,
	trades,
	futuresTrades,
	aggTrades,
	futuresAggTrades,
	ticker,
	futuresTicker,
	allTickers,
	futuresAllTicker,
	futuresMarkPrice,
	futuresAllMarkPrice,
	futuresBookTicker,
	futuresForceOrder,
	user: user(opts),
	marginUser: user(opts, 'margin'),
	futuresUser: user(opts, 'futures'),
})
