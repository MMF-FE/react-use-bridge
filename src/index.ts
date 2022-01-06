import { useRef, useCallback, useEffect } from 'react'

export type MsgData<T = any> = {
    method?: string
    callbackId?: string
    data?: T
}
let _callbackId = 0

export default function useBridge(
    brdgingSupplier: {
        [key: string]: (...args: any[]) => any
    },
    target = window,
    msgPre = 'yzMsg:',
    targetOrigin = '*'
) {
    const asyncGetDataList: {
        [callbackId: string]: {
            resolve: (data: any) => void
            reject: (err: any) => void
        }
    } = useRef({}).current

    /**
     * 发送消息
     */
    const sendMessage = useCallback(
        <T = any>(data: MsgData<T>) => {
            if (target !== window) {
                target.postMessage(`${msgPre}${JSON.stringify(data)}`, targetOrigin)
            }
        },
        [msgPre, target, targetOrigin]
    )

    /**
     * 处理 app 通信的异步返回
     * @param msgData
     * @param timeout
     * @returns
     */
    const asyncGetData = useCallback(
        <T = any>(msgData: MsgData, timeout = 5000): Promise<T> => {
            _callbackId++
            const callbackId = `yzCallbackId:${_callbackId}`
            return new Promise((resolve, reject) => {
                asyncGetDataList[callbackId] = {
                    resolve,
                    reject,
                }
                sendMessage({
                    ...msgData,
                    callbackId,
                })
                setTimeout(() => {
                    if (asyncGetDataList[callbackId]) {
                        reject(new Error('timeout'))
                        delete asyncGetDataList[callbackId]
                    }
                }, timeout)
            })
        },
        [sendMessage]
    )

    const asyncSetData = useCallback(
        (callbackId: string, data: any) => {
            sendMessage({
                callbackId,
                data,
            })
        },
        [sendMessage]
    )

    const onMessage = useCallback(
        (evt: MessageEvent) => {
            const msg = String(evt.data)
            if (!msg.startsWith(msgPre)) {
                return
            }
            const data: MsgData = JSON.parse(msg.substring(msgPre.length))

            const method = data.method || ''

            if (typeof data === 'object' && data.callbackId && !brdgingSupplier[method]) {
                const callbackId = data.callbackId
                if (callbackId && asyncGetDataList[callbackId]) {
                    const { resolve } = asyncGetDataList[callbackId]
                    delete asyncGetDataList[callbackId]
                    resolve(data.data)
                    return
                }
            } else if (method) {
                if (brdgingSupplier[method]) {
                    const callbackId = data.callbackId
                    if (!callbackId) {
                        return brdgingSupplier[method](data)
                    }
                    const result = brdgingSupplier[method](data)
                    if (
                        result instanceof Promise ||
                        (result && typeof result.then === 'function')
                    ) {
                        result.then((data: any) => {
                            asyncSetData(callbackId, data)
                        })
                    }
                } else {
                    console.log('on msg:', method, data)
                }
            }
        },
        [msgPre]
    )

    useEffect(() => {
        window.addEventListener('message', onMessage, false)
        return () => {
            window.removeEventListener('message', onMessage, false)
        }
    }, [onMessage])

    return {
        sendMessage,
        asyncGetData,
        asyncSetData,
    }
}
