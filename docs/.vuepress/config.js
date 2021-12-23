const upqn = require('@yzfe-private/upqn').default
const fetch = require('node-fetch').default
const path = require('path')
const fs = require('fs')
const pkgName = process.env.npm_package_name.replace('@', '')
const pkgVersion = process.env.npm_package_version || '1.0.0'
const docsType = 'nodejs'
const basePath = `/docs/${docsType}/${pkgName}/`
const cdnBase = `https://yz-cdn.meimeifa.com${basePath}`
const nodeEnv = process.env.NODE_ENV
const ciToken = process.env.CI_TOKEN || ''
const distPath = path.resolve(path.join(__dirname, 'dist'))

const config = {
    base: nodeEnv === 'production' ? basePath : '/',
    title: 'react-use-bridge',
    description: 'iframe postmessage the react hooks',
    themeConfig: {
        search: false,
        sidebar: 'auto',
        nav: [
            { text: 'Home', link: '/' }
        ],
        logo:
            'https://yz-cdn.meimeifa.com/yzt/fe/logo/Node.js.png'
    },
    plugins: [
        'vuepress-plugin-typescript',
        {
            async generated(pagePaths) {
                if (nodeEnv === 'production') {
                    // 上传到 CDN
                    await upqn({
                        dir: {
                            path: distPath,
                            prefix: basePath
                        }
                    })

                    // 将文档同步到 fe.yzone.co/docs/vue 下
                    await updateDocs(pagePaths)
                }
            }
        }
    ],
    configureWebpack: () => {
        if (nodeEnv === 'production') {
            return {
                output: {
                    publicPath: cdnBase
                }
            }
        }
        return {}
    }
}

/**
 * 请求 api
 * @param {string} url
 * @param {object} data
 */
function api(url, data) {
    const apiHost = 'https://fe.yzone.co/api'
    return fetch(`${apiHost}${url}`, {
        method: 'PUT',
        headers: {
            'content-type': 'application/json',
            token: ciToken
        },
        body: JSON.stringify(data)
    }).then(res => res.json())
}

/**
 * 更新文档
 * @param {string[]} pagePaths
 */
async function updateDocs(pagePaths) {
    const reqDocs = {
        type: docsType,
        name: pkgName,
        version: pkgVersion,
        title: config.title,
        desc: config.description,
        logo: config.themeConfig.logo
    }

    const resDocs = await api('/v1/docs/', reqDocs)

    const docsId = resDocs.id

    const tasks = pagePaths.map(v => {
        return api('/v1/docs/html', {
            docsId,
            html: fs.readFileSync(v, 'utf8'),
            path: path.resolve(v).replace(distPath + '/', '')
        })
    })

    const resIds = await Promise.all(tasks)

    console.log(`同步文档成功，共 ${resIds.length} 个文件`)
}

module.exports = config
