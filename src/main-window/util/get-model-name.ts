import { ModelDescriptor } from 'src/main/ModelManager'

/**
 * Takes a model descriptor and returns the most human-readable name possible.
 *
 * @param   {ModelDescriptor}  model  The model descriptor
 *
 * @return  {string}                  The model's name
 */
export function getModelName (model: ModelDescriptor): string {
  // Either if the provided name is undefined, or if the authors just added a
  // period or a space as a name (looking at you, QuantFactory's Llama3 Q4_K_M)
  if (model.metadata?.general.name === undefined || model.metadata.general.name.length < 3) {
    return model.name
  } else {
    return model.metadata.general.name
  }
}
