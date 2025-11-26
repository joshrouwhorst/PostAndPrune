import DraftListFilters from '@/components/DraftListFilters'
import DraftPostList from '@/components/DraftPostList'
import { LinkButton } from '@/components/ui/forms'
import TwoColumn from '@/components/ui/TwoColumn'
import DraftsProvider from '@/providers/DraftsProvider'
import { Plus } from 'lucide-react'

export default async function Drafts() {
  return (
    <DraftsProvider>
      <TwoColumn reverseStack>
        <TwoColumn.Main>
          <DraftListFilters />
          <DraftPostList />
        </TwoColumn.Main>
        <TwoColumn.Side>
          <h1 className="text-2xl font-bold mb-4">Draft List</h1>
          <div className="mt-2">
            <LinkButton
              variant="primary"
              size="sm"
              href="/drafts/create"
              className=""
            >
              <Plus /> Create Draft
            </LinkButton>
          </div>
          <div className="mt-4">
            <p>
              Posts have buttons along the top to publish, duplicate, edit, or
              delete the posts. There is also a button to copy the JSON
              representation of the post for debugging purposes.
            </p>
            <p className="my-2">
              On the bottom right of the post is a link to the group that the
              post belongs to.
            </p>
          </div>
        </TwoColumn.Side>
      </TwoColumn>
    </DraftsProvider>
  )
}
