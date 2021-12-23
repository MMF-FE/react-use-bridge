## react-use-bridge

iframe postMessage 通信的 react hooks

### 安装

```bash
yarn add @yzfe/react-use-bridge
```

### 快速开始

#### iframe 端

```tsx
import useBridge, { MsgData } from '@yzfe/react-use-bridge'
import React, { useCallback } from 'react'

const Page: React.FC<{}> = (props) => {

    // 对外发布方法
    const bridge = useBridge({
        say: useCallback((data: MsgData<{ name: string }>) => {
            const { name } = data
            alert(name)
        }, [])
        getName: useCallback((data: MsgData<{ callbackId?: string }>) => {
            const { callbackId } = data

            if (callbackId) {
                bridge.asyncSetData(callbackId, 'iframe name')
            }
        }, [])
    }, window.parent)

    useEffect(() => {
        // 调用父页面方法
        bridge.sendMessage({
            method: 'hello',
            data: {
                name: 'js'
            }
        })

        // 异步取值
        bridge.asyncGetData<string>({
            method: 'getUrl'
        }).then(url => console.log(url))
    }, [])

    return null
}

export default React.memo(Page)
```

#### 主页面

```tsx
import useBridge, { MsgData } from '@yzfe/react-use-bridge'
import React, { useCallback, useRef } from 'react'

const Page: React.FC<{}> = (props) => {

    const iframeRef = useRef<HTMLIFrameElement | null>(null)

    // 对外发布方法
    const bridge = useBridge({
        hello: useCallback((data: MsgData<{ name: string }>) => {
            const { name } = data
            alert(name)
        }, [])
        getUrl: useCallback((data: MsgData<{ callbackId?: string }>) => {
            const { callbackId } = data

            if (callbackId) {
                bridge.asyncSetData(callbackId, location.href)
            }
        }, [])
    }, iframeRef.current)

    const onLoad = useCallback(() => {
        // 调用 iframe 方法
        bridge.sendMessage({
            method: 'say',
            data: {
                name: 'iframe'
            }
        })

        // 异步取值
        bridge.asyncGetData<string>({
            method: 'getName'
        }).then(name => console.log(name))
    }, [])

    return (
        <iframe src="xxx" ref={iframeRef} onLoad={onLoad}/>
    )
}

export default React.memo(Page)
```

::: warning
通信的数据，会被 JSON 序列化后传递。
:::
