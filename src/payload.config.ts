import { mongooseAdapter } from '@payloadcms/db-mongodb'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Events } from '@/collections/Events'
import { Groups } from '@/collections/Groups'
import { Tags } from '@/collections/Tags'
import { Users } from '@/collections/Users'
import Icon from '@/graphics/Icon'
import Logo from '@/graphics/Logo'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      graphics: {
        Logo: Logo,
        Icon: Icon,
    },
  },
  meta: {
    titleSuffix: ` - Admin`,
  },
},

  collections: [Events, Groups, Tags, Users],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || '',
  }),
})
