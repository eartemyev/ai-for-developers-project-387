[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace BookACall.E2e.Tests;

[CollectionDefinition("E2E")]
public sealed class E2eCollection : ICollectionFixture<E2eAppFixture>;
