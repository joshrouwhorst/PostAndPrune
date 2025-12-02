import { CreateDraftForm } from '@/components/CreateDraftForm'
import TwoColumn from '@/components/ui/TwoColumn'
import DraftProvider from '@/providers/DraftsProvider'

export default async function UpdateDraft({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <DraftProvider>
      <TwoColumn reverseStack>
        <TwoColumn.Main>
          <CreateDraftForm redirect="/drafts" directoryName={id} />
        </TwoColumn.Main>
        <TwoColumn.Side>
          <h2 className="text-lg font-semibold mb-4">Update Draft</h2>
          <p className="mb-4">
            Update an existing draft. After updating, you will be redirected to
            the drafts list where you can see all your drafts.
          </p>
        </TwoColumn.Side>
      </TwoColumn>
    </DraftProvider>
  )
}
