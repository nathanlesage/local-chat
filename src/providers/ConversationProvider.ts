export interface ChatMessage {
  role: 'user'|'assistant'
  content: string
}

export interface Conversation {
  description: string
  startedAt: number
  modelId: string
  messages: ChatMessage[]
}

export class ConversationProvider {
  private conversations: Conversation[]
  constructor () {
    //
  }

  async boot () {}

  createConversation () {}

  readConversation () {}

  updateConversation () {}

  deleteConversation () {}
}
