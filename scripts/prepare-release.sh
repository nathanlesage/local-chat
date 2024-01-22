#!/usr/bin/env sh

CURRENT_VERSION="v$(cat package.json | jq -r '.version')"

echo "The current version for LocalChat is $CURRENT_VERSION."
echo "Which version should be updated to? Please provide in the format vX.Y.Z"

read NEW_VERSION

echo "Will bump the version for LocalChat to $NEW_VERSION. Continue?"

# Give the user a last chance to redo if something went wrong
select yn in "Continue" "Abort"; do
  case $yn in
    Continue ) break;;
    Abort ) echo "Aborting process."; exit;;
  esac
done

echo "Bumping version in package.json ..."
jq ".version = \"$NEW_VERSION\"" package.json > package.json
echo "Committing changes..."
git add package.json
git commit -m "chore: Bump version to $NEW_VERSION"
git push
echo "Tagging commit ..."
git tag -a $NEW_VERSION -m "Release version $NEW_VERSION"
git push origin $NEW_VERSION
echo "Done."
