import { communities, getFactory, Store } from '@quiet/state-manager'
import { Community, CommunityOwnership, CreateNetworkPayload, InvitationPair } from '@quiet/types'
import { FactoryGirl } from 'factory-girl'
import { expectSaga } from 'redux-saga-test-plan'
import { handleInvitationCodeSaga } from './handleInvitationCode.saga'
import { SocketState } from '../socket/socket.slice'
import { prepareStore } from '../../testUtils/prepareStore'
import { StoreKeys } from '../../store/store.keys'
import { modalsActions } from '../modals/modals.slice'
import { ModalName } from '../modals/modals.types'

describe('Handle invitation code', () => {
  let store: Store
  let factory: FactoryGirl
  let community: Community
  let validInvitationPair: InvitationPair[]

  beforeEach(async () => {
    store = (
      await prepareStore({
        [StoreKeys.Socket]: {
          ...new SocketState(),
          isConnected: true,
        },
      })
    ).store

    factory = await getFactory(store)
    validInvitationPair = [
      {
        onionAddress: 'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdvcbzw5vex2crsr26qd',
        peerId: 'QmZoiJNAvCffeEHBjk766nLuKVdkxkAT7wfFJDPPLsbKSE',
      },
    ]
  })

  it('creates network if code is valid', async () => {
    const payload: CreateNetworkPayload = {
      ownership: CommunityOwnership.User,
      peers: validInvitationPair,
    }
    await expectSaga(handleInvitationCodeSaga, communities.actions.handleInvitationCodes(validInvitationPair))
      .withState(store.getState())
      .put(communities.actions.createNetwork(payload))
      .run()
  })

  it('does not try to create network if user is already in community', async () => {
    community = await factory.create<ReturnType<typeof communities.actions.addNewCommunity>['payload']>('Community')
    const payload: CreateNetworkPayload = {
      ownership: CommunityOwnership.User,
      peers: validInvitationPair,
    }

    await expectSaga(handleInvitationCodeSaga, communities.actions.handleInvitationCodes(validInvitationPair))
      .withState(store.getState())
      .put(
        modalsActions.openModal({
          name: ModalName.warningModal,
          args: {
            title: 'You already belong to a community',
            subtitle: "We're sorry but for now you can only be a member of a single community at a time.",
          },
        })
      )
      .not.put(communities.actions.createNetwork(payload))
      .run()
  })

  it('does not try to create network if code is invalid', async () => {
    const payload: CreateNetworkPayload = {
      ownership: CommunityOwnership.User,
      peers: [],
    }

    await expectSaga(handleInvitationCodeSaga, communities.actions.handleInvitationCodes([]))
      .withState(store.getState())
      .put(communities.actions.clearInvitationCodes())
      .put(
        modalsActions.openModal({
          name: ModalName.warningModal,
          args: {
            title: 'Invalid link',
            subtitle: 'The invite link you received is not valid. Please check it and try again.',
          },
        })
      )
      .not.put(communities.actions.createNetwork(payload))
      .run()
  })
})
